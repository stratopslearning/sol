import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  disconnectConnector,
  listRecentSyncRuns,
  scheduleConnectorSync,
  updateConnectorConfig,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const patchSchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const runs = await listRecentSyncRuns(auth.user, id);
    return NextResponse.json({ runs });
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
      scope: 'materials:write',
      professorOnly: true,
    });
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const connector = await updateConnectorConfig(auth.user, id, body.config);
    return NextResponse.json({ connector });
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
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 10,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const action = req.nextUrl.searchParams.get('action') ?? 'sync';
    if (action === 'sync') {
      await scheduleConnectorSync(auth.user, id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const { id } = await ctx.params;
    await disconnectConnector(auth.user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
