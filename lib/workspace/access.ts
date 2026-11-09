import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courses,
  DEFAULT_WORKSPACE_ID,
  sections,
  studentSections,
  workspaceLicenses,
  workspaceMemberships,
  workspaces,
} from '@/app/db/schema';
import { adminHasTenantDataAccess } from '@/lib/authz/supportAccess';
import type { UserData as AppUser } from '@/lib/getOrCreateUser';

export { DEFAULT_WORKSPACE_ID };

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type WorkspaceLicenseRow = typeof workspaceLicenses.$inferSelect;

/**
 * Ensure the backfilled default workspace exists (idempotent).
 * Seeds/smoke/tests only — gated by ALLOW_DEFAULT_WORKSPACE=1.
 * Product request paths must fail closed without a resolved tenant.
 */
export async function ensureDefaultWorkspace(): Promise<WorkspaceRow> {
  if (process.env.ALLOW_DEFAULT_WORKSPACE !== '1') {
    throw new Error(
      'ensureDefaultWorkspace is disabled. Set ALLOW_DEFAULT_WORKSPACE=1 for seeds/tests only; product paths must resolve a real tenant.',
    );
  }
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, DEFAULT_WORKSPACE_ID),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(workspaces)
    .values({
      id: DEFAULT_WORKSPACE_ID,
      slug: 'default',
      name: 'Default workspace',
      type: 'institution',
      status: 'active',
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    await db.insert(workspaceLicenses).values({
      workspaceId: created.id,
      plan: 'institution',
      seatCap: 100_000,
      billingProvider: 'manual',
      status: 'active',
    });
    return created;
  }

  const again = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, DEFAULT_WORKSPACE_ID),
  });
  if (!again) {
    throw new Error('Failed to ensure default workspace');
  }
  return again;
}

export async function getWorkspace(workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
}

export async function getActiveLicense(
  workspaceId: string,
): Promise<WorkspaceLicenseRow | undefined> {
  return db.query.workspaceLicenses.findFirst({
    where: and(
      eq(workspaceLicenses.workspaceId, workspaceId),
      inArray(workspaceLicenses.status, ['active', 'trialing']),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

/** Active learner seats used in a workspace (distinct students in active enrollments). */
export async function countActiveLearners(
  workspaceId: string,
): Promise<number> {
  const { fetchWorkspaceActiveLearnerCount } = await import(
    '@/lib/workspace/workspaceScopedReads'
  );
  return fetchWorkspaceActiveLearnerCount(workspaceId);
}

export type SeatCheckResult =
  | { ok: true; used: number; cap: number }
  | { ok: false; used: number; cap: number; reason: string };

/** Refuse new learner enroll when over seat cap. */
export async function assertSeatAvailable(
  workspaceId: string,
): Promise<SeatCheckResult> {
  const license = await getActiveLicense(workspaceId);
  if (!license) {
    return {
      ok: false,
      used: 0,
      cap: 0,
      reason: 'No active license for this workspace.',
    };
  }
  if (license.status === 'canceled' || license.status === 'past_due') {
    return {
      ok: false,
      used: 0,
      cap: license.seatCap,
      reason: 'Workspace license is not active.',
    };
  }
  const used = await countActiveLearners(workspaceId);
  if (used >= license.seatCap) {
    return {
      ok: false,
      used,
      cap: license.seatCap,
      reason: `Learner seat limit reached (${used}/${license.seatCap}).`,
    };
  }
  return { ok: true, used, cap: license.seatCap };
}

export async function getCourseWorkspaceId(
  courseId: string,
): Promise<string | null> {
  const { fetchCourseById } = await import('@/lib/db/entityScopedReads');
  const course = await fetchCourseById(courseId);
  return course?.workspaceId ?? null;
}

/**
 * Workspace access via membership or learner enrollment. Platform ADMIN needs
 * an active support_access_grants row (no global tenant bypass).
 */
export async function userCanAccessWorkspace(
  user: Pick<AppUser, 'id' | 'platformStaff'> & { platformStaff?: boolean },
  workspaceId: string,
): Promise<boolean> {
  if (user.platformStaff) {
    return adminHasTenantDataAccess(user, workspaceId);
  }
  const membership = await db.query.workspaceMemberships.findFirst({
    where: and(
      eq(workspaceMemberships.workspaceId, workspaceId),
      eq(workspaceMemberships.userId, user.id),
      eq(workspaceMemberships.status, 'active'),
    ),
  });
  if (membership) return true;

  const viaEnrollment = await db
    .select({ id: courses.id })
    .from(courses)
    .innerJoin(sections, eq(sections.courseId, courses.id))
    .innerJoin(
      studentSections,
      and(
        eq(studentSections.sectionId, sections.id),
        eq(studentSections.studentId, user.id),
        eq(studentSections.status, 'ACTIVE'),
      ),
    )
    .where(eq(courses.workspaceId, workspaceId))
    .limit(1);
  return viaEnrollment.length > 0;
}

export async function assertCourseInWorkspace(
  courseId: string,
  workspaceId: string,
): Promise<boolean> {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.workspaceId, workspaceId)),
    columns: { id: true },
  });
  return Boolean(course);
}

/**
 * Upsert a workspace SEAT. Seats carry no authority — power comes only from
 * role_bindings (and student_sections). This always writes role='member';
 * the legacy `role` argument is accepted for call-site compatibility and ignored.
 */
export async function ensureWorkspaceMembership(opts: {
  workspaceId: string;
  userId: string;
  /** @deprecated Ignored. Seats are role-less ('member'); grant a role_binding instead. */
  role?: 'owner' | 'admin' | 'instructor' | 'learner' | 'member';
  status?: 'active' | 'invited' | 'removed';
}): Promise<void> {
  // FORCE RLS: bare membership insert/update flakes without a sticky tenant GUC.
  const { ensureWorkspaceMembershipDefiner } = await import(
    '@/lib/db/facultyWriteDefiners'
  );
  await ensureWorkspaceMembershipDefiner({
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    status: opts.status ?? 'active',
  });
}
