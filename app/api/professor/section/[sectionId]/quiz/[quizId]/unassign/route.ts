import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { professorSections, quizSections } from '@/app/db/schema';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ sectionId: string; quizId: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      throw ApiError.unauthorized();
    }

    const limited = await enforceRateLimit({
      key: `quiz-unassign:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many unassign requests. Please wait a moment.',
    });
    if (limited) return limited;

    const { sectionId, quizId } = await context.params;

    if (user.role === 'PROFESSOR') {
      const enrollment = await db.query.professorSections.findFirst({
        where: and(
          eq(professorSections.sectionId, sectionId),
          eq(professorSections.professorId, user.id),
        ),
      });
      if (!enrollment) {
        throw ApiError.forbidden('Not enrolled in this section');
      }
    }

    await db
      .delete(quizSections)
      .where(
        and(
          eq(quizSections.sectionId, sectionId),
          eq(quizSections.quizId, quizId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
