import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  workspaceLicenses,
  workspaceMemberships,
  workspaces,
} from '@/app/db/schema';
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

export type CourseCreateEntitlement =
  | { ok: true }
  | { ok: false; reason: string; code: 'billing_required' | 'license_inactive' };

/** True when license.periodEnd is set and still in the future (admin comp / trial). */
export function licenseHasOpenCompWindow(license: {
  periodEnd?: Date | null;
}): boolean {
  return Boolean(
    license.periodEnd && license.periodEnd.getTime() > Date.now(),
  );
}

type EntitlementSnapshot = {
  workspace_exists: boolean;
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

/**
 * Creator/Business (Stripe): require active license with subscription id,
 * OR a still-open admin complimentary window (periodEnd in the future).
 * Department/Institution (manual): require active/trialing license (honor periodEnd).
 *
 * Reads via SECURITY DEFINER — FORCE RLS otherwise hides workspace/license
 * without app.tenant_id and falsely returns "Workspace not found".
 */
export async function assertWorkspaceAllowsCourseCreate(
  workspaceId: string,
): Promise<CourseCreateEntitlement> {
  const snap = await loadCourseEntitlementSnapshot(workspaceId);
  if (!snap?.workspace_exists) {
    return { ok: false, reason: 'Workspace not found', code: 'license_inactive' };
  }

  if (!snap.license_status) {
    return {
      ok: false,
      reason: 'No active license for this workspace.',
      code: 'license_inactive',
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

  if (license.periodEnd && license.periodEnd.getTime() < Date.now()) {
    if (license.billingProvider === 'stripe' && !license.stripeSubscriptionId) {
      return {
        ok: false,
        reason: 'Complimentary access expired. Finish billing to keep creating courses.',
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
      reason: 'Finish workspace billing to create courses.',
      code: 'billing_required',
    };
  }

  return { ok: true };
}

/**
 * Admin grant: time-boxed complimentary access so Creator/Business can operate
 * without Stripe (local demos, pilots). Does not create a Stripe subscription.
 */
export async function grantWorkspaceCompAccess(opts: {
  workspaceId: string;
  days?: number;
}): Promise<{ periodStart: Date; periodEnd: Date }> {
  const days = Math.min(Math.max(opts.days ?? 30, 1), 365);
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + days * 24 * 60 * 60 * 1000);

  const existing = await db.query.workspaceLicenses.findFirst({
    where: eq(workspaceLicenses.workspaceId, opts.workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  if (!existing) {
    throw new Error('Workspace has no license row');
  }

  await db
    .update(workspaceLicenses)
    .set({
      status: 'trialing',
      periodStart,
      periodEnd,
      updatedAt: periodStart,
    })
    .where(eq(workspaceLicenses.id, existing.id));

  await db
    .update(workspaces)
    .set({ status: 'trial', updatedAt: periodStart })
    .where(eq(workspaces.id, opts.workspaceId));

  return { periodStart, periodEnd };
}
