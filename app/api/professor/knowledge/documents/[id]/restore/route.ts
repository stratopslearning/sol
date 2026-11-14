import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { restoreDocumentVersionForUser } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  versionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    await restoreDocumentVersionForUser(auth.user, id, body.versionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
