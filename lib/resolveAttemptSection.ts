/**
 * Pick which section context to stamp on a new attempt when a learner is
 * enrolled in multiple sections that share the same quiz.
 *
 * Submit previously used `findFirst`, which returned an arbitrary row and
 * caused attempts to land under the wrong section — hiding them from the
 * professor's results for the section they actually teach.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';

export async function resolveAttemptSectionId(
  studentId: string,
  quizSectionIds: string[],
  preferredSectionId?: string | null,
): Promise<string | null> {
  if (quizSectionIds.length === 0) return null;

  if (
    preferredSectionId &&
    quizSectionIds.includes(preferredSectionId)
  ) {
    const preferred = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, studentId),
        eq(studentSections.sectionId, preferredSectionId),
        eq(studentSections.status, 'ACTIVE'),
      ),
    });
    if (preferred) return preferredSectionId;
  }

  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
      inArray(studentSections.sectionId, quizSectionIds),
    ),
    orderBy: [desc(studentSections.enrolledAt)],
  });

  return enrollments[0]?.sectionId ?? null;
}
