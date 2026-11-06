import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { softDeleteBooks } from '@/lib/books';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  bookIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: NextRequest) {
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

    const body = bodySchema.parse(await req.json());
    const meta = extractRequestMeta(req);
    const result = await softDeleteBooks(auth.user, body.bookIds, meta);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
