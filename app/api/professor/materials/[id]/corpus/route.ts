import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { setMaterialAuthoringCorpus } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const schema = z.object({
  authoringCorpus: z.enum(['prior_course', 'this_term']),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-materials-write:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const body = schema.parse(await req.json());
    const material = await setMaterialAuthoringCorpus(
      auth.user,
      id,
      body.authoringCorpus,
    );
    return NextResponse.json({ material });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
