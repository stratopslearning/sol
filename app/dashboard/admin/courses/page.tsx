import { db } from "@/app/db";
import { courses, sections } from "@/app/db/schema";
import { CourseFormModal } from "@/components/admin/CourseFormModal";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { activeOnly } from "@/lib/db/filters";
import { requireAdmin } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";

import AdminCoursesPageContentClient from "./AdminCoursesPageContentClient";

export default async function AdminCoursesPage() {
  await requireAdmin();
  const allCourses = await db.query.courses.findMany({
    where: activeOnly(courses.deletedAt),
  });
  const allSections = await db.query.sections.findMany({
    where: activeOnly(sections.deletedAt),
  });
  const sectionCountByCourse: Record<string, number> = {};
  for (const section of allSections) {
    sectionCountByCourse[section.courseId] =
      (sectionCountByCourse[section.courseId] || 0) + 1;
  }

  const coursesWithCount = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    sectionCount: sectionCountByCourse[c.id] || 0,
  }));

  return (
    <AppShell role="admin" active="courses" topbarEyebrow="Administration" topbarTitle="Courses">
      <PageHeader
        breadcrumbs={[
          { label: "Overview", href: withBasePath("/dashboard/admin") },
          { label: "Courses" },
        ]}
        eyebrow="Catalog"
        title="Courses."
        description="Every course on the platform — create, edit, and assign to sections from one place."
        actions={<CourseFormModal mode="create" />}
      />
      <div className="mt-10">
        <AdminCoursesPageContentClient courses={coursesWithCount} />
      </div>
    </AppShell>
  );
}
