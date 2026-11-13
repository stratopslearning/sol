import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { revokeWorkspaceInvite } from '@/lib/workspace/members';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string; inviteId: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, inviteId } = await ctx.params;
    const limited = await enforceRateLimit({
      key: `ws-invites-revoke:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    await revokeWorkspaceInvite({
      actorUserId: user.id,
      workspaceId,
      inviteId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
