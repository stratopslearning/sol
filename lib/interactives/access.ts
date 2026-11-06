import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  interactiveSections,
  interactives,
  studentSections,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { authorize, userHasAnyBinding } from '@/lib/authz/authorize';
import { authorizeOnSection } from '@/lib/authz/courseAccess';
import { TEACHING_ROLES } from '@/lib/authz/permissions';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'platformStaff'> & { platformStaff?: boolean };

async function userCanWriteInteractive(
  user: AuthUser,
  interactive: {
    id: string;
    professorId: string | null;
    tenantId?: string | null;
    offeringId?: string | null;
  },
): Promise<boolean> {
  if (interactive.tenantId && interactive.offeringId) {
    if (
      await authorize(user, 'content.write', {
        tenantId: interactive.tenantId,
        scopeType: 'offering',
        scopeId: interactive.offeringId,
      })
    ) {
      return true;
    }
  }

  const links = await db.query.interactiveSections.findMany({
    where: eq(interactiveSections.interactiveId, interactive.id),
    columns: { sectionId: true },
  });
  for (const link of links) {
    if (await authorizeOnSection(user, 'content.write', link.sectionId)) {
      return true;
    }
  }

  // Authorship is metadata: only counts with a teaching binding in the tenant,
  // or (legacy rows without tenantId) when the author still teaches via sections.
  const authorId = interactive.professorId;
  if (authorId && authorId === user.id) {
    if (interactive.tenantId) {
      return userHasAnyBinding(user.id, interactive.tenantId, TEACHING_ROLES);
    }
    return true;
  }

  return false;
}

export async function assertCanManageInteractive(
  user: AuthUser,
  interactiveId: string,
) {
  const interactive = await db.query.interactives.findFirst({
    where: and(
      eq(interactives.id, interactiveId),
      isNull(interactives.deletedAt),
    ),
  });
  if (!interactive) {
    throw ApiError.notFound('Interactive not found');
  }
  if (!(await userCanWriteInteractive(user, interactive))) {
    throw ApiError.forbidden('You do not manage this interactive');
  }
  return interactive;
}

export async function assertStudentCanAccessInteractive(
  user: AuthUser,
  interactiveId: string,
) {
  const interactive = await db.query.interactives.findFirst({
    where: and(
      eq(interactives.id, interactiveId),
      isNull(interactives.deletedAt),
    ),
  });
  if (!interactive || !interactive.isActive) {
    throw ApiError.notFound('Interactive not found');
  }

  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, user.id),
      eq(studentSections.status, 'ACTIVE'),
    ),
    columns: { sectionId: true },
  });
  const sectionIds = enrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) {
    throw ApiError.forbidden('Not enrolled');
  }
  const link = await db.query.interactiveSections.findFirst({
    where: and(
      eq(interactiveSections.interactiveId, interactiveId),
      inArray(interactiveSections.sectionId, sectionIds),
    ),
  });
  if (!link) throw ApiError.forbidden('Not assigned to your sections');
  return interactive;
}

export async function listTeachableSectionsForCourse(
  user: AuthUser,
  courseId: string,
): Promise<string[]> {
  return listTeachableSectionIdsForCourse(user, courseId);
}
