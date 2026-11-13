import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { softDeleteChapters } from '@/lib/books';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  chapterIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-books-write:${auth.user.id}`,
      limit: 40,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { bookId } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    const meta = extractRequestMeta(req);
    const result = await softDeleteChapters(
      auth.user,
      bookId,
      body.chapterIds,
      meta,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
