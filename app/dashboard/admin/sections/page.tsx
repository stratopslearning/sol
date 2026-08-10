import { db } from '@/app/db';
import { courses, sections } from '@/app/db/schema';
import { AppShell } from '@/components/layout/AppShell';
import { activeOnly } from '@/lib/db/filters';
import { requireAdmin } from '@/lib/auth';
import { appPath } from '@/lib/basePath';
import { partitionBySectionConclusion } from '@/lib/sectionAvailability';

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
  const mapped = allSectionsRaw.map((section) => ({
    ...section,
    learnerCount: section.studentSections.filter((e) => e.status === 'ACTIVE')
      .length,
    facultyCount: section.professorSections.filter((e) => e.status === 'ACTIVE')
      .length,
  }));
  const { active: ongoingSections, archived: pastSections } =
    partitionBySectionConclusion(mapped);
  const allCourses = await db.query.courses.findMany({
    where: activeOnly(courses.deletedAt),
  });

  return (
    <AppShell role="admin" active="sections" topbarEyebrow="Administration" topbarTitle="Sections">
      <SectionsPageContentClient
        allSections={ongoingSections}
        allCourses={allCourses}
        pastSectionsHref={appPath('/dashboard/admin/sections/archived')}
        pastSectionsCount={pastSections.length}
      />
    </AppShell>
  );
}
