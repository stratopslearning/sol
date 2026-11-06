import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { lessonSections, lessons, studentSections } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id'> & { platformStaff?: boolean | null };

export async function assertCanManageLesson(user: AuthUser, lessonId: string) {
  const lesson = await db.query.lessons.findFirst({
    where: and(eq(lessons.id, lessonId), isNull(lessons.deletedAt)),
  });
  if (!lesson) throw ApiError.notFound('Lesson not found');
  await assertCanManageCourse(user, lesson.courseId);
  return lesson;
}

/** Student may access an active lesson assigned to one of their active sections. */
export async function assertStudentCanAccessLesson(
  studentId: string,
  lessonId: string,
) {
  const lesson = await db.query.lessons.findFirst({
    where: and(
      eq(lessons.id, lessonId),
      eq(lessons.isActive, true),
      isNull(lessons.deletedAt),
    ),
  });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const assignments = await db.query.lessonSections.findMany({
    where: eq(lessonSections.lessonId, lessonId),
  });
  if (assignments.length === 0) throw ApiError.forbidden('Lesson not assigned');

  const sectionIds = assignments.map((a) => a.sectionId);
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
  });
  const enrolled = new Set(enrollments.map((e) => e.sectionId));
  const ok = sectionIds.some((id) => enrolled.has(id));
  if (!ok) throw ApiError.forbidden('You are not enrolled in this lesson');

  return lesson;
}
