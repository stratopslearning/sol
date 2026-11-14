import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { authorize } from '@/lib/authz/authorize';
import { transferWorkspaceOwnership } from '@/lib/authz/ownership';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getActiveWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  toUserId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceRateLimit({
    key: `ownership-transfer:${user.id}`,
    limit: 5,
    windowMs: 60_000,
    prefix: 'rl',
  });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const workspaceId =
    parsed.data.workspaceId ?? (await getActiveWorkspaceId(user.id));
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const canTransfer = await authorize(user, 'ownership.transfer', {
    tenantId: workspaceId,
    scopeType: 'organization',
    scopeId: workspaceId,
  });
  if (!canTransfer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await transferWorkspaceOwnership({
      workspaceId,
      fromUserId: user.id,
      toUserId: parsed.data.toUserId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transfer failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'workspace.ownership_transfer',
    targetType: 'workspace',
    targetId: workspaceId,
    metadata: { toUserId: parsed.data.toUserId },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true });
}
