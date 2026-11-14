import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { refineOutlineChat } from '@/lib/authoring/refine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  focusItemId: z.string().uuid().optional(),
  materialIds: z.array(z.string().uuid()).max(40).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'authoring:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-authoring-chat:${auth.user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const body = chatSchema.parse(await req.json());
    const meta = extractRequestMeta(req);
    const result = await refineOutlineChat(
      auth.user,
      {
        outlineId: id,
        message: body.message,
        focusItemId: body.focusItemId,
        materialIds: body.materialIds,
      },
      meta,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
