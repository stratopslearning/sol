/**
 * Hard delete (purge) of a quiz. The cascading FK policies introduced in
 * 0004 take care of attempts, assignments, questions, and quiz_sections : 
 * we only need to delete the parent row.
 *
 * Soft-delete is exposed at the parent route (DELETE /api/admin/quiz/[id]).
 * Use this purge endpoint only for FERPA right-to-be-forgotten requests or
 * to clean up test data; once a row is purged here it cannot be restored.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { quizzes, users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';

export const dynamic = 'force-dynamic';

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
    if (!user || !user.platformStaff) {
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
    if (!targetQuiz.tenantId) {
      return NextResponse.json({ error: 'Quiz missing tenant' }, { status: 400 });
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      targetQuiz.tenantId,
      { action: 'support.tenant_access', targetType: 'quiz', targetId: quizId },
    );

    await db.delete(quizzes).where(eq(quizzes.id, quizId));

    const meta = extractRequestMeta(request);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.quiz.purge',
      targetType: 'quiz',
      targetId: quizId,
      metadata: { title: targetQuiz.title, hard: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error purging quiz:', error);
    return apiErrorResponse(error);
  }
}
