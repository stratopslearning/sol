import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  courses,
  DEFAULT_WORKSPACE_ID,
  sections,
  users,
  workspaceLicenses,
  workspaces,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import { apiErrorResponse } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import {
  grantWorkspaceCompAccess,
  revokeWorkspaceCompAccess,
} from '@/lib/workspace/entitlement';

export const dynamic = 'force-dynamic';

const deleteBodySchema = z.object({
  /** Must exactly match workspace.slug — intentional double-check. */
  confirmSlug: z.string().min(1).max(64),
});

const patchBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('grant_comp_access'),
    /** Complimentary window length (1–365). Ignored when indefinite. */
    days: z.number().int().min(1).max(365).optional(),
    indefinite: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('revoke_comp_access'),
  }),
]);

async function requireAdminUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });
  if (!user || !user.platformStaff) return null;
  return user;
}

/**
 * Admin license ops (grant / revoke complimentary pilot access without Stripe).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    const parsed = patchBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    await requireSupportGrant(
      {
        id: admin.id,
        clerkId: admin.clerkId,
        platformStaff: admin.platformStaff,
      },
      workspaceId,
      {
        action: 'support.tenant_access',
        targetType: 'workspace',
        targetId: workspaceId,
      },
    );
    if (workspace.status === 'churned') {
      return NextResponse.json(
        { error: 'Cannot change access on a churned workspace' },
        { status: 400 },
      );
    }

    if (parsed.data.action === 'revoke_comp_access') {
      const { revokedAt } = await revokeWorkspaceCompAccess({ workspaceId });
      await logAudit({
        actorUserId: admin.id,
        actorClerkId: admin.clerkId,
        action: 'workspace.revoke_comp_access',
        targetType: 'workspace',
        targetId: workspaceId,
        metadata: {
          slug: workspace.slug,
          revokedAt: revokedAt.toISOString(),
        },
      });
      return NextResponse.json({
        success: true,
        workspaceId,
        revokedAt: revokedAt.toISOString(),
      });
    }

    const indefinite = Boolean(parsed.data.indefinite);
    const days = indefinite ? undefined : (parsed.data.days ?? 30);
    const { periodStart, periodEnd } = await grantWorkspaceCompAccess({
      workspaceId,
      days,
      indefinite,
    });

    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'workspace.grant_comp_access',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: {
        slug: workspace.slug,
        indefinite,
        days: indefinite ? null : (days ?? 30),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd?.toISOString() ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      indefinite,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[admin/workspaces PATCH]', error);
    return apiErrorResponse(error);
  }
}

/**
 * Delete a workspace (admin only).
 * - Empty workspace (no active courses, no children): hard delete (cascades).
 * - Has active courses: soft delete — churn workspace, cancel licenses, soft-delete courses/sections.
 * Blocked: default workspace, slug mismatch, child workspaces.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    const parsed = deleteBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Type the workspace slug to confirm delete' },
        { status: 400 },
      );
    }

    if (workspaceId === DEFAULT_WORKSPACE_ID) {
      return NextResponse.json(
        { error: 'The default workspace cannot be deleted' },
        { status: 400 },
      );
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    await requireSupportGrant(
      {
        id: admin.id,
        clerkId: admin.clerkId,
        platformStaff: admin.platformStaff,
      },
      workspaceId,
      {
        action: 'support.tenant_access',
        targetType: 'workspace',
        targetId: workspaceId,
      },
    );

    if (workspace.status === 'churned') {
      return NextResponse.json(
        { error: 'Workspace is already soft-deleted (churned)' },
        { status: 400 },
      );
    }

    if (parsed.data.confirmSlug.trim() !== workspace.slug) {
      return NextResponse.json(
        {
          error: `Slug confirmation failed. Type exactly “${workspace.slug}” to delete.`,
        },
        { status: 400 },
      );
    }

    const [childRow] = await db
      .select({ n: count() })
      .from(workspaces)
      .where(eq(workspaces.parentWorkspaceId, workspaceId));
    const childCount = Number(childRow?.n ?? 0);
    if (childCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${childCount} child workspace${childCount === 1 ? '' : 's'} still reference this institution. Delete or re-parent them first.`,
          childCount,
        },
        { status: 409 },
      );
    }

    const activeCourses = await db.query.courses.findMany({
      where: and(
        eq(courses.workspaceId, workspaceId),
        activeOnly(courses.deletedAt),
      ),
      columns: { id: true },
    });
    const courseCount = activeCourses.length;
    const now = new Date();

    if (courseCount > 0) {
      const courseIds = activeCourses.map((c) => c.id);
      await db
        .update(sections)
        .set({ deletedAt: now, isActive: false })
        .where(
          and(inArray(sections.courseId, courseIds), isNull(sections.deletedAt)),
        );
      await db
        .update(courses)
        .set({ deletedAt: now, isActive: false })
        .where(
          and(eq(courses.workspaceId, workspaceId), isNull(courses.deletedAt)),
        );
      await db
        .update(workspaceLicenses)
        .set({ status: 'canceled', updatedAt: now })
        .where(eq(workspaceLicenses.workspaceId, workspaceId));
      await db
        .update(workspaces)
        .set({ status: 'churned', updatedAt: now })
        .where(eq(workspaces.id, workspaceId));

      await logAudit({
        actorUserId: admin.id,
        actorClerkId: admin.clerkId,
        action: 'workspace.soft_delete',
        targetType: 'workspace',
        targetId: workspaceId,
        metadata: {
          slug: workspace.slug,
          name: workspace.name,
          type: workspace.type,
          courseCount,
          mode: 'soft',
        },
      });

      return NextResponse.json({
        success: true,
        mode: 'soft',
        workspaceId,
        courseCount,
      });
    }

    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'workspace.delete',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: {
        slug: workspace.slug,
        name: workspace.name,
        type: workspace.type,
        mode: 'hard',
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'hard',
      deletedId: workspaceId,
    });
  } catch (error) {
    console.error('[admin/workspaces DELETE]', error);
    return apiErrorResponse(error);
  }
}
