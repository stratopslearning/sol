import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { publishOutlineItems } from '@/lib/authoring/publish';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const bodySchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(40),
  sectionIds: z.array(z.string().uuid()).optional(),
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
      key: `professor-authoring-bulk-publish:${auth.user.id}`,
      limit: 8,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const json = bodySchema.parse(await req.json());
    const meta = extractRequestMeta(req);
    const result = await publishOutlineItems(
      auth.user,
      id,
      json.itemIds,
      { sectionIds: json.sectionIds },
      meta,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
