import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { releaseBook } from '@/lib/books';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sectionIds: z.array(z.string().uuid()).optional(),
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
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { bookId } = await ctx.params;
    const meta = extractRequestMeta(req);
    let sectionIds: string[] | undefined;
    try {
      const json = bodySchema.parse(await req.json());
      sectionIds = json.sectionIds;
    } catch {
      sectionIds = undefined;
    }

    const book = await releaseBook(
      auth.user,
      bookId,
      { sectionIds },
      meta,
    );
    return NextResponse.json({ book });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
