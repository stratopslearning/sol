import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { quizzes } from '@/app/db/schema';
import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { activeOnly } from '@/lib/db/filters';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(req, { scope: 'quizzes:write' });

    const limited = await enforceRateLimit({
      key: `quiz-archive:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many archive requests. Please wait a moment.',
    });
    if (limited) return limited;

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
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json({ error: 'Failed to archive quiz' }, { status: 500 });
  }
}
