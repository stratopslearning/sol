import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { previewOutlineItem } from '@/lib/authoring/preview';

export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    mode: z.enum(['faculty', 'student']).optional(),
  })
  .optional();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'authoring:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-authoring-write:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { itemId } = await ctx.params;
    let mode: 'faculty' | 'student' = 'faculty';
    try {
      const json = await req.json();
      const parsed = bodySchema.parse(json);
      if (parsed?.mode) mode = parsed.mode;
    } catch {
      // empty body OK
    }
    const result = await previewOutlineItem(auth.user, itemId, { mode });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
