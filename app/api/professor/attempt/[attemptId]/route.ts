import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getAttemptDetail } from '@/lib/professor/grading';

export const dynamic = 'force-dynamic';

/** Full attempt detail (answers + AI feedback) — audited disclosure. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ attemptId: string }> },
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

    const { attemptId } = await context.params;
    const attempt = await getAttemptDetail(auth.user, attemptId);
    return NextResponse.json({ attempt });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
