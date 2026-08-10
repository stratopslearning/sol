import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { listProfessorQuizzes } from '@/lib/professor/quizzes';

export const dynamic = 'force-dynamic';

/** Quizzes assigned to sections the caller teaches, with summary stats. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });

    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const quizzes = await listProfessorQuizzes(auth.user);
    return NextResponse.json({ quizzes });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
