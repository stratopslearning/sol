import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getSectionGradebook } from '@/lib/professor/grading';

export const dynamic = 'force-dynamic';

/** Section gradebook matrix (best score per learner) — audited disclosure. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
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

    const { sectionId } = await context.params;
    const gradebook = await getSectionGradebook(auth.user, sectionId);
    return NextResponse.json({ gradebook });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
