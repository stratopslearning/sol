import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  listAuthoringRevisions,
  restoreAuthoringRevision,
} from '@/lib/authoring/revisions';

export const dynamic = 'force-dynamic';

const restoreSchema = z.object({
  revisionId: z.string().uuid(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const revisions = await listAuthoringRevisions(auth.user, id);
    return NextResponse.json({ revisions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
      key: `professor-authoring-write:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    await ctx.params; // outline id validated via revision ownership
    const body = restoreSchema.parse(await req.json());
    const outline = await restoreAuthoringRevision(
      auth.user,
      body.revisionId,
    );
    return NextResponse.json({ outline });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
