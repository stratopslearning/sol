import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  archiveOutline,
  getOutlineDetail,
  listAuthoringMessages,
  restoreOutlineAsCurrent,
  updateOutlineMeta,
} from '@/lib/authoring/outlines';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['DRAFT', 'READY', 'ARCHIVED']).optional(),
  /** Bring this outline back as the course's editable current draft. */
  restore: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const outline = await getOutlineDetail(auth.user, id);
    const includeMessages =
      req.nextUrl.searchParams.get('messages') === '1';
    const messages = includeMessages
      ? await listAuthoringMessages(auth.user, id)
      : undefined;
    return NextResponse.json({ outline, messages });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
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
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    if (body.restore) {
      const outline = await restoreOutlineAsCurrent(auth.user, id);
      const messages = await listAuthoringMessages(auth.user, id);
      return NextResponse.json({ outline, messages });
    }
    if (body.status === 'ARCHIVED' && body.title == null) {
      const archived = await archiveOutline(auth.user, id);
      return NextResponse.json({ outline: archived });
    }
    const outline = await updateOutlineMeta(auth.user, id, body);
    return NextResponse.json({ outline });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
