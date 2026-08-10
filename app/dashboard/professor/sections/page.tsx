import Link from "next/link";
import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { professorSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { appPath, withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { partitionEnrollmentsByConclusion } from "@/lib/sectionAvailability";

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

  const { active: activeEnrollments, archived: archivedEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);

  const sectionsList = activeEnrollments.map((e) => ({
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
        description="Ongoing sections you teach this term, with the enrolment codes to share with learners."
        actions={
          <Button asChild variant="outline">
            <Link href={appPath("/dashboard/professor/sections/archived")}>
              View past sections
              {archivedEnrollments.length > 0
                ? ` (${archivedEnrollments.length})`
                : ""}
            </Link>
          </Button>
        }
      />
      <div className="mt-10">
        <SectionsPageContentClient sectionsList={sectionsList} />
      </div>
    </AppShell>
  );
}
