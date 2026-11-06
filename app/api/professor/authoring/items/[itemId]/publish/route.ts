import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { publishOutlineItem } from '@/lib/authoring/publish';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  sectionIds: z.array(z.string().uuid()).optional(),
});

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
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { itemId } = await ctx.params;
    const json = bodySchema.parse(
      (await req.json().catch(() => ({}))) as unknown,
    );
    const meta = extractRequestMeta(req);
    const item = await publishOutlineItem(
      auth.user,
      itemId,
      { sectionIds: json.sectionIds },
      meta,
    );
    return NextResponse.json({ item });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
