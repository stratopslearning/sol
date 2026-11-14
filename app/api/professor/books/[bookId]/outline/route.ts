import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { createOutlineFromBook } from '@/lib/books';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'authoring:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-authoring-write:${auth.user.id}`,
      limit: 10,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { bookId } = await ctx.params;
    const meta = extractRequestMeta(req);
    const outline = await createOutlineFromBook(auth.user, bookId, meta);
    return NextResponse.json({ outline }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
