import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getProfessorQuiz } from '@/lib/professor/quizzes';

export const dynamic = 'force-dynamic';

/** Quiz detail with questions (answer keys only for the owner / admins). */
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
    const quiz = await getProfessorQuiz(auth.user, quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
