import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { professorSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

import SectionsPageContentClient from "./SectionsPageContentClient";

export default async function ProfessorSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: {
        with: {
          course: true,
          studentSections: true,
        },
      },
    },
  });

  const sectionsList = enrollments.map((e) => ({
    ...e.section,
    learnerCount: e.section.studentSections.filter((s) => s.status === "ACTIVE")
      .length,
  }));

  return (
    <AppShell
      role="professor"
      active="sections"
      topbarEyebrow="Faculty"
      topbarTitle="My sections"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          { label: "My sections" },
        ]}
        eyebrow="Teaching"
        title="Your sections."
        description="The sections you teach this term, with the enrolment codes to share with learners."
      />
      <div className="mt-10">
        <SectionsPageContentClient sectionsList={sectionsList} />
      </div>
    </AppShell>
  );
}
