import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { quizzes, users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Soft delete: sets `deleted_at = now()`. The row is preserved so an admin
 * can audit / restore / purge later. Reads everywhere filter `deleted_at IS
 * NULL`, so users see the quiz disappear immediately.
 *
 * Hard delete (with FK cascades to attempts/assignments/etc.) is exposed
 * separately at /api/admin/quiz/[quizId]/purge for FERPA-grade right-to-be-
 * forgotten requests.
 */
export async function DELETE(
  request: NextRequest,
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const targetQuiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });
    if (!targetQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    if (targetQuiz.deletedAt) {
      // Idempotent: deleting an already-deleted quiz is a no-op success.
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    await db
      .update(quizzes)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(quizzes.id, quizId));

    const meta = extractRequestMeta(request);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.quiz.delete',
      targetType: 'quiz',
      targetId: quizId,
      metadata: { title: targetQuiz?.title ?? null, soft: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}
