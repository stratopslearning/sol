import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  workspaceLicenses,
  workspaceMemberships,
  workspaces,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { authorize } from '@/lib/authz/authorize';
import { listBoundWorkspaceIds } from '@/lib/authz/gates';

/** Seat role is always 'member'; legacy values only appear on un-migrated rows. */
export type MembershipRole = 'member' | 'owner' | 'admin' | 'instructor' | 'learner';

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string,
) {
  return db.query.workspaceMemberships.findFirst({
    where: and(
      eq(workspaceMemberships.workspaceId, workspaceId),
      eq(workspaceMemberships.userId, userId),
      eq(workspaceMemberships.status, 'active'),
    ),
  });
}

/**
 * Workspaces the user can switch into for teaching/admin — driven by role_bindings
 * only (membership role is seat-only; no legacy fallback).
 */
export async function listActiveMembershipsForUser(userId: string) {
  const boundIds = await listBoundWorkspaceIds(userId);
  // Bindings only: no membership-role fallback (seats carry no power).
  if (boundIds.length === 0) return [];

  // FORCE RLS hides membership/workspace rows without app.tenant_id, and
  // withTenant GUC pinning is unreliable on Neon pooled WS — hydrate via DEFINER.
  const { fetchUserActiveMembershipsDetail } = await import(
    '@/lib/authz/userScopedReads'
  );
  const bound = new Set(boundIds);
  const rows = await fetchUserActiveMembershipsDetail(userId);
  return rows.filter((m) => bound.has(m.workspaceId));
}

/** Owner or admin binding (billing / export / audit). */
export async function userCanManageWorkspaceBilling(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  return authorize(
    { id: userId },
    'billing.manage',
    {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    },
  );
}

/** People invite permission at org scope. */
export async function userCanInviteWorkspaceFaculty(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  return authorize(
    { id: userId },
    'people.invite',
    {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    },
  );
}

/** Create courses / offerings in the workspace. */
export async function userCanCreateCoursesInWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  return authorize(
    { id: userId },
    'catalog.create_course',
    {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    },
  );
}

export type TeachingEntitlement =
  | { ok: true }
  | { ok: false; reason: string; code: 'billing_required' | 'license_inactive' };

/** @deprecated Alias — prefer TeachingEntitlement / assertWorkspaceAllowsTeaching. */
export type CourseCreateEntitlement = TeachingEntitlement;

/**
 * Open admin complimentary window: finite (periodEnd in the future) or
 * indefinite (trialing with null periodEnd). New Creator/Business tenants are
 * provisioned as `incomplete` so this only matches after an admin Grant click
 * (or a finite window with periodEnd).
 */
export function licenseHasOpenCompWindow(license: {
  status?: string | null;
  periodEnd?: Date | null;
}): boolean {
  if (license.periodEnd && license.periodEnd.getTime() > Date.now()) {
    return true;
  }
  return license.status === 'trialing' && license.periodEnd == null;
}

type EntitlementSnapshot = {
  workspace_exists: boolean;
  workspace_status: string | null;
  workspace_type: string | null;
  license_status: string | null;
  billing_provider: string | null;
  stripe_subscription_id: string | null;
  period_end: Date | string | null;
};

async function loadCourseEntitlementSnapshot(
  workspaceId: string,
): Promise<EntitlementSnapshot | null> {
  const { sql } = await import('drizzle-orm');
  const result = await db.execute(sql`
    SELECT
      workspace_exists,
      workspace_status,
      workspace_type,
      license_status,
      billing_provider,
      stripe_subscription_id,
      period_end
    FROM sol_workspace_course_entitlement(${workspaceId}::uuid)
  `);
  const rows =
    (result as unknown as { rows?: EntitlementSnapshot[] }).rows ??
    (Array.isArray(result) ? (result as EntitlementSnapshot[]) : []);
  return rows[0] ?? null;
}

function evaluateTeachingEntitlement(
  snap: EntitlementSnapshot,
): TeachingEntitlement {
  if (!snap.workspace_exists) {
    return { ok: false, reason: 'Workspace not found', code: 'license_inactive' };
  }

  if (snap.workspace_status === 'churned') {
    return {
      ok: false,
      reason: 'This workspace has been closed.',
      code: 'license_inactive',
    };
  }

  if (snap.workspace_status === 'suspended') {
    return {
      ok: false,
      reason:
        'Pilot ended. Finish billing to keep teaching, or ask SOL to restore access.',
      code: 'billing_required',
    };
  }

  const periodEnd = snap.period_end
    ? snap.period_end instanceof Date
      ? snap.period_end
      : new Date(snap.period_end)
    : null;
  const license = {
    status: snap.license_status,
    billingProvider: snap.billing_provider,
    stripeSubscriptionId: snap.stripe_subscription_id,
    periodEnd,
  };

  if (!license.status) {
    if (license.billingProvider === 'stripe') {
      return {
        ok: false,
        reason: 'Finish workspace billing to keep teaching.',
        code: 'billing_required',
      };
    }
    return {
      ok: false,
      reason: 'No active license for this workspace.',
      code: 'license_inactive',
    };
  }

  // Revoked / canceled unpaid Stripe pilot → billing paywall.
  if (
    (license.status === 'canceled' || license.status === 'past_due') &&
    license.billingProvider === 'stripe' &&
    !license.stripeSubscriptionId
  ) {
    return {
      ok: false,
      reason:
        'Pilot ended. Finish billing to keep teaching, or ask SOL to restore access.',
      code: 'billing_required',
    };
  }

  if (license.periodEnd && license.periodEnd.getTime() < Date.now()) {
    if (license.billingProvider === 'stripe' && !license.stripeSubscriptionId) {
      return {
        ok: false,
        reason:
          'Complimentary access expired. Finish billing to keep teaching.',
        code: 'billing_required',
      };
    }
    return {
      ok: false,
      reason: 'This workspace license has ended.',
      code: 'license_inactive',
    };
  }

  if (license.billingProvider === 'stripe') {
    if (license.status === 'active' && license.stripeSubscriptionId) {
      return { ok: true };
    }
    if (licenseHasOpenCompWindow(license)) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: 'Finish workspace billing to keep teaching.',
      code: 'billing_required',
    };
  }

  // Manual (department/institution): active/trialing license, honor periodEnd above.
  if (license.status === 'active' || license.status === 'trialing') {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'No active license for this workspace.',
    code: 'license_inactive',
  };
}

/**
 * Creator/Business (Stripe): require active license with subscription id,
 * OR an open admin complimentary window (finite periodEnd or indefinite null).
 * Department/Institution (manual): require active/trialing license (honor periodEnd).
 * Suspended/churned workspaces are blocked.
 *
 * Reads via SECURITY DEFINER — FORCE RLS otherwise hides workspace/license
 * without app.tenant_id and falsely returns "Workspace not found".
 */
export async function assertWorkspaceAllowsTeaching(
  workspaceId: string,
): Promise<TeachingEntitlement> {
  const snap = await loadCourseEntitlementSnapshot(workspaceId);
  if (!snap) {
    return { ok: false, reason: 'Workspace not found', code: 'license_inactive' };
  }
  return evaluateTeachingEntitlement(snap);
}

/** Same rules as teaching — kept for call sites that create courses/sections. */
export async function assertWorkspaceAllowsCourseCreate(
  workspaceId: string,
): Promise<CourseCreateEntitlement> {
  return assertWorkspaceAllowsTeaching(workspaceId);
}

/**
 * Throw ApiError 402/403 when teaching is not allowed.
 * Platform staff skip (support grant is enforced separately by callers).
 */
export async function requireWorkspaceTeaching(
  workspaceId: string,
  actor?: { platformStaff?: boolean | null },
): Promise<void> {
  if (actor?.platformStaff) return;
  const entitlement = await assertWorkspaceAllowsTeaching(workspaceId);
  if (entitlement.ok) return;
  if (entitlement.code === 'billing_required') {
    throw ApiError.paymentRequired(entitlement.reason);
  }
  throw ApiError.forbidden(entitlement.reason);
}

/** Resolve course → workspace, then require teaching entitlement. */
export async function requireCourseTeaching(
  courseId: string,
  actor?: { platformStaff?: boolean | null },
): Promise<string> {
  if (actor?.platformStaff) {
    const { getCourseWorkspaceId } = await import('@/lib/workspace/access');
    const workspaceId = await getCourseWorkspaceId(courseId);
    if (!workspaceId) throw ApiError.notFound('Course not found');
    return workspaceId;
  }
  const { getCourseWorkspaceId } = await import('@/lib/workspace/access');
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.notFound('Course not found');
  await requireWorkspaceTeaching(workspaceId, actor);
  return workspaceId;
}

/** Resolve section → tenant, then require teaching entitlement. */
export async function requireSectionTeaching(
  sectionId: string,
  actor?: { platformStaff?: boolean | null },
): Promise<string> {
  const { tenantIdForSection } = await import('@/lib/authz');
  const workspaceId = await tenantIdForSection(sectionId);
  if (!workspaceId) throw ApiError.notFound('Section not found');
  await requireWorkspaceTeaching(workspaceId, actor);
  return workspaceId;
}

/**
 * Admin grant: complimentary access so Creator/Business can operate without
 * Stripe. Finite (1–365 days) or indefinite (periodEnd null). Re-grant clears
 * suspended and restores trialing.
 */
export async function grantWorkspaceCompAccess(opts: {
  workspaceId: string;
  days?: number;
  indefinite?: boolean;
}): Promise<{ periodStart: Date; periodEnd: Date | null }> {
  const { grantWorkspaceCompAccessDefiner } = await import(
    '@/lib/db/tenantWriteDefiners'
  );
  try {
    return await grantWorkspaceCompAccessDefiner({
      workspaceId: opts.workspaceId,
      days: opts.days,
      indefinite: opts.indefinite,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('no license row')) {
      throw new Error('Workspace has no license row');
    }
    throw err;
  }
}

/**
 * Revoke unpaid pilot: cancel license, suspend workspace. Blocks teaching until
 * Stripe checkout or a later grant. Refuses when a live Stripe subscription exists.
 */
export async function revokeWorkspaceCompAccess(opts: {
  workspaceId: string;
}): Promise<{ revokedAt: Date }> {
  const { revokeWorkspaceCompAccessDefiner } = await import(
    '@/lib/db/tenantWriteDefiners'
  );
  try {
    return await revokeWorkspaceCompAccessDefiner(opts.workspaceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('no license row')) {
      throw new Error('Workspace has no license row');
    }
    if (message.includes('STRIPE_ACTIVE_SUBSCRIPTION')) {
      throw ApiError.badRequest(
        'Cannot revoke a workspace with an active Stripe subscription. Cancel billing in Stripe instead.',
      );
    }
    throw err;
  }
}
