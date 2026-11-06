import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { readJsonBody } from '@/lib/api/readJsonBody';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/workspace/activeWorkspace';
import { listActiveMembershipsForUser } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = bodySchema.parse(await readJsonBody(req));
  const memberships = await listActiveMembershipsForUser(user.id);
  const allowed = memberships.some((m) => m.workspaceId === body.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, workspaceId: body.workspaceId });
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, body.workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
