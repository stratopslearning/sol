import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { listQuizAttempts } from '@/lib/professor/grading';

export const dynamic = 'force-dynamic';

/** Submitted attempts for a quiz, scoped to sections the caller teaches. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });

    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { quizId } = await context.params;
    const sectionId = new URL(req.url).searchParams.get('sectionId');
    const attempts = await listQuizAttempts(auth.user, quizId, {
      sectionId: sectionId ?? undefined,
    });
    return NextResponse.json({ attempts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
