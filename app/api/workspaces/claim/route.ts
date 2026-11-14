import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { claimWorkspaceInvite } from '@/lib/workspace/invites';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(16).max(200),
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceRateLimit({
    key: `ws-claim:${user.id}`,
    limit: 20,
    windowMs: 60_000,
    prefix: 'rl',
    message: 'Too many claim attempts.',
  });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const result = await claimWorkspaceInvite({
    token: parsed.data.token,
    user: {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    workspaceId: result.workspaceId,
    workspaceName: result.workspaceName,
  });
}
