import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { readJsonBody } from '@/lib/api/readJsonBody';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  ACTIVE_WORKSPACE_COOKIE,
  personalCreatorSlug,
  provisionWorkspace,
} from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  path: z.enum(['teach', 'department']),
  name: z.string().min(1).max(120).optional(),
  departmentName: z.string().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const isTeach = parsed.data.path === 'teach';
  const displayName =
    parsed.data.departmentName?.trim() ||
    parsed.data.name?.trim() ||
    (isTeach
      ? [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        'My workspace'
      : 'Department workspace');

  const slug = isTeach
    ? personalCreatorSlug(user.id)
    : `dept-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;

  const { workspace } = await provisionWorkspace({
    slug,
    name: isTeach ? `${displayName} (Creator)` : displayName,
    type: isTeach ? 'creator' : 'department',
    ownerUserId: user.id,
    actorUserId: user.id,
    actorClerkId: user.clerkId,
  });

  // Authority is role_bindings (owner written by provisionWorkspace). Global
  // STUDENT/PROFESSOR shells are no longer promoted on onboarding.

  const meta = extractRequestMeta(req);
  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'onboarding.workspace',
    targetType: 'workspace',
    targetId: workspace.id,
    tenantId: workspace.id,
    metadata: { path: parsed.data.path, slug: workspace.slug },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const res = NextResponse.json({
    success: true,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    redirectTo: '/dashboard/professor',
  });
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
