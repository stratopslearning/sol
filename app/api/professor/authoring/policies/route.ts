import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  getAuthoringPolicyForWorkspace,
  upsertAuthoringPolicy,
} from '@/lib/authoring/policies';

export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  workspaceId: z.string().uuid(),
  structureNotes: z.string().max(4000).nullable().optional(),
  rubricStyle: z.string().max(2000).nullable().optional(),
  tone: z.string().max(2000).nullable().optional(),
  extraPrompt: z.string().max(4000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 },
      );
    }
    const policy = await getAuthoringPolicyForWorkspace(auth.user, workspaceId);
    return NextResponse.json({ policy });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
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

    const body = upsertSchema.parse(await req.json());
    const policy = await upsertAuthoringPolicy(auth.user, body.workspaceId, {
      structureNotes: body.structureNotes,
      rubricStyle: body.rubricStyle,
      tone: body.tone,
      extraPrompt: body.extraPrompt,
    });
    return NextResponse.json({ policy });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
