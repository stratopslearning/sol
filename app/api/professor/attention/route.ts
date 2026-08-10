import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';

export const dynamic = 'force-dynamic';

/** Attempts needing grading attention in sections the caller teaches. */
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

    const limitParam = new URL(req.url).searchParams.get('limit');
    const items = await getAttentionItemsForProfessor(auth.user.id, {
      limit: limitParam ? Number(limitParam) : undefined,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
