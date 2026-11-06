import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { isSectionConcluded } from '@/lib/sectionAvailability';

/** Resolve an optional ?section= id to a breadcrumb-safe label if the student is enrolled. */
export async function resolveStudentSectionBreadcrumb(
  studentId: string,
  sectionId: string | null | undefined,
): Promise<{ id: string; name: string } | null> {
  if (!sectionId) return null;
  const enrollment = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.sectionId, sectionId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: true },
  });
  if (!enrollment?.section || isSectionConcluded(enrollment.section)) {
    return null;
  }
  return { id: enrollment.section.id, name: enrollment.section.name };
}
