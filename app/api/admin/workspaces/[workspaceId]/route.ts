import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { DEFAULT_WORKSPACE_ID, users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import {
  adminHardDeleteWorkspaceDefiner,
  adminSoftDeleteWorkspaceDefiner,
  adminWorkspaceDeleteInfoDefiner,
} from '@/lib/db/tenantWriteDefiners';
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

    // FORCE RLS: platform staff have no membership → bare findFirst is null.
    // Platform Ops license/delete actions match create + owner-invite: platform_staff
    // only (no support grant). Teaching PII routes still require grants.
    const workspace = await adminWorkspaceDeleteInfoDefiner(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
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
 * Delete a workspace.
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

    // FORCE RLS: platform staff without membership cannot see workspace rows.
    // Platform Ops delete: platform_staff only (same as create / owner-invite).
    const workspace = await adminWorkspaceDeleteInfoDefiner(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

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

    if (workspace.childCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${workspace.childCount} child workspace${workspace.childCount === 1 ? '' : 's'} still reference this institution. Delete or re-parent them first.`,
          childCount: workspace.childCount,
        },
        { status: 409 },
      );
    }

    if (workspace.activeCourseCount > 0) {
      const soft = await adminSoftDeleteWorkspaceDefiner(workspaceId);
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
          courseCount: soft.courseCount,
          mode: 'soft',
        },
      });

      return NextResponse.json({
        success: true,
        mode: 'soft',
        workspaceId,
        courseCount: soft.courseCount,
      });
    }

    const hard = await adminHardDeleteWorkspaceDefiner(workspaceId);

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
      deletedId: hard.deletedId,
    });
  } catch (error) {
    console.error('[admin/workspaces DELETE]', error);
    return apiErrorResponse(error);
  }
}
