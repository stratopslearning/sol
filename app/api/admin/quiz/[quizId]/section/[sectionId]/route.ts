import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizSections, quizzes, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; sectionId: string }> }
) {
  try {
    const { quizId, sectionId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check if user is admin
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || !user.platformStaff) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
      columns: { tenantId: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    if (!quiz.tenantId) {
      return NextResponse.json({ error: 'Quiz missing tenant' }, { status: 400 });
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      quiz.tenantId,
      { action: 'support.tenant_access', targetType: 'quiz', targetId: quizId },
    );
    // Delete the quiz-section assignment
    await db.delete(quizSections).where(and(eq(quizSections.quizId, quizId), eq(quizSections.sectionId, sectionId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unassigning quiz from section:', error);
    return apiErrorResponse(error);
  }
} 