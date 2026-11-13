import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { isSectionConcluded } from '@/lib/sectionAvailability';

export type StudentSectionContext = {
  sectionId: string;
  sectionName: string;
  courseId: string;
  courseTitle: string;
  endsAt: Date | string | null;
};

/** Active, non-concluded enrollment for a student section hub. */
export async function requireStudentSectionAccess(
  studentId: string,
  sectionId: string,
): Promise<StudentSectionContext> {
  const enrollment = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.sectionId, sectionId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: {
      section: { with: { course: true } },
    },
  });

  const section = enrollment?.section;
  if (!section || isSectionConcluded(section)) {
    notFound();
  }

  return {
    sectionId: section.id,
    sectionName: section.name,
    courseId: section.courseId,
    courseTitle: section.course?.title ?? 'Course',
    endsAt: section.endsAt ?? null,
  };
}
