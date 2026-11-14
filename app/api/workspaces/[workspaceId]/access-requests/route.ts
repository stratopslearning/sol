import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  createWorkspaceAccessRequest,
  listPendingAccessRequests,
} from '@/lib/workspace/accessRequests';
import { userCanInviteWorkspaceFaculty } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  email: z.string().email().max(320).optional(),
  name: z.string().max(200).optional(),
  /** Requesters may only ask for instructor; admin is approver-chosen on decide. */
  claimedRole: z.literal('instructor').optional(),
});

/** List pending (owners) or create a request (any signed-in user). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await ctx.params;
  const can = await userCanInviteWorkspaceFaculty(user.id, workspaceId);
  if (!can) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const requests = await listPendingAccessRequests(workspaceId);
  return NextResponse.json({ requests });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `access-req:${user.id}`,
      limit: 10,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { workspaceId } = await ctx.params;
    const parsed = createSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const email = (parsed.data.email ?? user.email).trim().toLowerCase();
    const result = await createWorkspaceAccessRequest({
      workspaceId,
      email,
      name: parsed.data.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      claimedRole: 'instructor',
      userId: user.id,
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    console.error('[access-requests POST]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
