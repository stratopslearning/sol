import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { quizzes, users } from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingQuiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Archiving deactivates the quiz across *all* sections including ones the
    // caller doesn't teach. Restrict it to the quiz owner (or an admin).
    const isAdmin = user.role === 'ADMIN';
    const isOwner = existingQuiz.professorId === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Archive sets `deletedAt` in addition to `isActive=false` so it shares
    // the same soft-delete tombstone as admin DELETE. Read paths filter on
    // `deletedAt IS NULL`, so archived quizzes drop out of every listing
    // immediately. They remain in the database for restore/audit/purge.
    const [archivedQuiz] = await db
      .update(quizzes)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    return NextResponse.json({
      success: true,
      quizId: archivedQuiz.id,
      message: 'Quiz archived successfully',
    });
  } catch (error) {
    console.error('Error archiving quiz:', error);
    return NextResponse.json({ error: 'Failed to archive quiz' }, { status: 500 });
  }
}
