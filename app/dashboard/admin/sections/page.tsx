import { db } from '@/app/db';
import { courses, sections } from '@/app/db/schema';
import { AppShell } from '@/components/layout/AppShell';
import { activeOnly } from '@/lib/db/filters';
import { requireAdmin } from '@/lib/auth';

import SectionsPageContentClient from './SectionsPageContentClient';

export default async function AdminSectionsPage() {
  await requireAdmin();
  const allSectionsRaw = await db.query.sections.findMany({
    where: activeOnly(sections.deletedAt),
    with: {
      course: true,
      studentSections: true,
      professorSections: true,
    },
  });
  const allSections = allSectionsRaw.map((section) => ({
    ...section,
    learnerCount: section.studentSections.filter((e) => e.status === 'ACTIVE')
      .length,
    facultyCount: section.professorSections.filter((e) => e.status === 'ACTIVE')
      .length,
  }));
  const allCourses = await db.query.courses.findMany({
    where: activeOnly(courses.deletedAt),
  });

  return (
    <AppShell role="admin" active="sections" topbarEyebrow="Administration" topbarTitle="Sections">
      <SectionsPageContentClient
        allSections={allSections}
        allCourses={allCourses}
      />
    </AppShell>
  );
}
