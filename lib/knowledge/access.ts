import { and, eq, gt, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseMaterials,
  courses,
  sections,
  supportAccessGrants,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import {
  assertCoursePermission,
  authorizeOnCourse,
  listCourseIdsWithPermission,
  type AuthzUser,
} from '@/lib/authz/courseAccess';

type AuthUser = AuthzUser;

export type TeachableCourse = {
  id: string;
  title: string;
  sectionCount: number;
};

/**
 * Courses the user may manage knowledge for: `knowledge.manage` via org /
 * department / offering / section role bindings. Membership seats and
 * professor_sections carry no power. Platform staff see only tenants with an
 * active support grant.
 */
export async function listTeachableCourses(
  user: AuthUser,
): Promise<TeachableCourse[]> {
  let courseIds: Set<string>;

  if (user.platformStaff) {
    const supportRows = await db.query.supportAccessGrants.findMany({
      where: and(
        eq(supportAccessGrants.userId, user.id),
        gt(supportAccessGrants.expiresAt, new Date()),
      ),
      columns: { tenantId: true },
    });
    const tenantIds = [...new Set(supportRows.map((r) => r.tenantId))];
    if (tenantIds.length === 0) return [];
    const rows = await db.query.courses.findMany({
      where: and(
        inArray(courses.workspaceId, tenantIds),
        isNull(courses.deletedAt),
      ),
      columns: { id: true },
    });
    courseIds = new Set(rows.map((c) => c.id));
  } else {
    courseIds = await listCourseIdsWithPermission(user.id, 'knowledge.manage');
  }

  if (courseIds.size === 0) return [];

  const { fetchCoursesByIds } = await import(
    '@/lib/workspace/workspaceScopedReads'
  );
  return fetchCoursesByIds([...courseIds]);
}

export async function assertCanManageCourse(
  user: AuthUser,
  courseId: string,
): Promise<{ id: string; title: string; workspaceId: string | null }> {
  const course = await assertCoursePermission(
    user,
    'knowledge.manage',
    courseId,
  );
  return {
    id: course.id,
    title: course.title,
    workspaceId: course.workspaceId,
  };
}

export async function assertCanManageMaterial(
  user: AuthUser,
  materialId: string,
) {
  const { fetchCourseMaterialByIdDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  const material = await fetchCourseMaterialByIdDefiner(materialId);
  if (!material || material.deletedAt) {
    throw ApiError.notFound('Material not found');
  }
  await assertCanManageCourse(user, material.courseId);
  return material as unknown as typeof courseMaterials.$inferSelect;
}

/**
 * True when the user holds `knowledge.manage` at ORGANIZATION scope for the
 * course's tenant (owner/admin bindings) — not merely a course-level lead.
 */
export async function isWorkspaceFacultyForCourse(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), isNull(courses.deletedAt)),
    columns: { id: true, workspaceId: true },
  });
  if (!course?.workspaceId) return false;
  const { authorize } = await import('@/lib/authz/authorize');
  return authorize({ id: userId }, 'knowledge.manage', {
    tenantId: course.workspaceId,
    scopeType: 'organization',
    scopeId: course.workspaceId,
  });
}

export { authorizeOnCourse };
