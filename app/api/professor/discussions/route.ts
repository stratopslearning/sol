import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { listProfessorDiscussions } from '@/lib/professor/discussions';

export const dynamic = 'force-dynamic';

/** Discussion bots the caller owns, plus duplicatable templates. */
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

    const discussions = await listProfessorDiscussions(auth.user);
    return NextResponse.json({ discussions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
