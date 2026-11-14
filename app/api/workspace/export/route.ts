import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courses,
  sections,
  workspaceMemberships,
  workspaceUsageDaily,
  workspaces,
} from '@/app/db/schema';
import { logAudit } from '@/lib/audit';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  getActiveWorkspaceId,
  userCanManageWorkspaceBilling,
} from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId =
    url.searchParams.get('workspaceId') ??
    (await getActiveWorkspaceId(user.id));
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }

  const canExport = await userCanManageWorkspaceBilling(user.id, workspaceId);
  const { authorize } = await import('@/lib/authz');
  const canWorkspaceExport = await authorize(user, 'workspace.export', {
    tenantId: workspaceId,
    scopeType: 'organization',
    scopeId: workspaceId,
  });
  if (!canExport && !canWorkspaceExport) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: { licenses: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const [courseRows, membershipRows, usageRows] = await Promise.all([
    db.query.courses.findMany({
      where: and(
        eq(courses.workspaceId, workspaceId),
        activeOnly(courses.deletedAt),
      ),
      with: {
        sections: {
          where: activeOnly(sections.deletedAt),
          orderBy: [desc(sections.createdAt)],
        },
      },
      orderBy: [desc(courses.createdAt)],
    }),
    db.query.workspaceMemberships.findMany({
      where: and(
        eq(workspaceMemberships.workspaceId, workspaceId),
        eq(workspaceMemberships.status, 'active'),
      ),
      with: {
        user: { columns: { id: true, email: true, platformStaff: true } },
      },
      orderBy: [desc(workspaceMemberships.createdAt)],
    }),
    db.query.workspaceUsageDaily.findMany({
      where: eq(workspaceUsageDaily.workspaceId, workspaceId),
      orderBy: [desc(workspaceUsageDaily.day)],
      limit: 365,
    }),
  ]);

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'workspace.export',
    targetType: 'workspace',
    targetId: workspaceId,
    tenantId: workspaceId,
    metadata: {
      courseCount: courseRows.length,
      membershipCount: membershipRows.length,
    },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      type: workspace.type,
      status: workspace.status,
      parentWorkspaceId: workspace.parentWorkspaceId,
      settings: workspace.settings,
      license: workspace.licenses?.[0] ?? null,
    },
    courses: courseRows.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt,
      sections: c.sections.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
    })),
    memberships: membershipRows.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      userId: m.userId,
      email: m.user?.email ?? null,
      platformStaff: m.user?.platformStaff ?? false,
      createdAt: m.createdAt,
    })),
    usageDaily: usageRows,
  };

  const filename = `workspace-${workspace.slug}-${payload.exportedAt.slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
