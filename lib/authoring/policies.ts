import { eq } from 'drizzle-orm';

import { authoringPolicies } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { fetchCourseById } from '@/lib/db/entityScopedReads';
import { withTenant } from '@/lib/db/tenantContext';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { assertWorkspaceFaculty } from '@/lib/knowledge/workspaceAccess';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'clerkId'> & { platformStaff?: boolean | null };

export type AuthoringPolicy = {
  id: string;
  workspaceId: string;
  structureNotes: string | null;
  rubricStyle: string | null;
  tone: string | null;
  extraPrompt: string | null;
  updatedAt: Date;
};

async function readAuthoringPolicyForWorkspace(
  workspaceId: string,
  actorUserId?: string | null,
): Promise<AuthoringPolicy | null> {
  return withTenant(workspaceId, actorUserId ?? null, async (tx) => {
    const row = await tx.query.authoringPolicies.findFirst({
      where: eq(authoringPolicies.workspaceId, workspaceId),
    });
    if (!row) return null;
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      structureNotes: row.structureNotes,
      rubricStyle: row.rubricStyle,
      tone: row.tone,
      extraPrompt: row.extraPrompt,
      updatedAt: row.updatedAt,
    };
  });
}

/** Trusted internal read after course-scoped authz (propose/switchUp/etc.). */
export async function getAuthoringPolicyForCourse(
  courseId: string,
): Promise<AuthoringPolicy | null> {
  const course = await fetchCourseById(courseId);
  const workspaceId = course?.workspaceId ?? course?.tenantId;
  if (!workspaceId) return null;
  return readAuthoringPolicyForWorkspace(workspaceId);
}

export async function getAuthoringPolicyForWorkspace(
  user: AuthUser,
  workspaceId: string,
): Promise<AuthoringPolicy | null> {
  await assertWorkspaceFaculty(user, workspaceId);
  return readAuthoringPolicyForWorkspace(workspaceId, user.id);
}

export async function upsertAuthoringPolicy(
  user: AuthUser,
  workspaceId: string,
  input: {
    structureNotes?: string | null;
    rubricStyle?: string | null;
    tone?: string | null;
    extraPrompt?: string | null;
  },
): Promise<AuthoringPolicy> {
  await assertWorkspaceFaculty(user, workspaceId);
  return withTenant(workspaceId, user.id, async (tx) => {
    const existing = await tx.query.authoringPolicies.findFirst({
      where: eq(authoringPolicies.workspaceId, workspaceId),
    });
    const values = {
      structureNotes: input.structureNotes ?? null,
      rubricStyle: input.rubricStyle ?? null,
      tone: input.tone ?? null,
      extraPrompt: input.extraPrompt ?? null,
      updatedAt: new Date(),
    };
    if (existing) {
      const [row] = await tx
        .update(authoringPolicies)
        .set(values)
        .where(eq(authoringPolicies.id, existing.id))
        .returning();
      return {
        id: row!.id,
        workspaceId: row!.workspaceId,
        structureNotes: row!.structureNotes,
        rubricStyle: row!.rubricStyle,
        tone: row!.tone,
        extraPrompt: row!.extraPrompt,
        updatedAt: row!.updatedAt,
      };
    }
    const [row] = await tx
      .insert(authoringPolicies)
      .values({ workspaceId, tenantId: workspaceId, ...values })
      .returning();
    return {
      id: row!.id,
      workspaceId: row!.workspaceId,
      structureNotes: row!.structureNotes,
      rubricStyle: row!.rubricStyle,
      tone: row!.tone,
      extraPrompt: row!.extraPrompt,
      updatedAt: row!.updatedAt,
    };
  });
}

export async function getAuthoringPolicyForManagedCourse(
  user: AuthUser,
  courseId: string,
): Promise<AuthoringPolicy | null> {
  await assertCanManageCourse(user, courseId);
  const course = await fetchCourseById(courseId);
  const workspaceId = course?.workspaceId ?? course?.tenantId;
  if (!workspaceId) return null;
  return readAuthoringPolicyForWorkspace(workspaceId, user.id);
}

export async function requireWorkspaceIdForCourse(
  courseId: string,
): Promise<string> {
  const course = await fetchCourseById(courseId);
  const workspaceId = course?.workspaceId ?? course?.tenantId;
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');
  return workspaceId;
}
