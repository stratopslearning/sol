import Link from "next/link";
import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { studentSections } from "@/app/db/schema";
import StudentEnrollFormWrapper from "@/components/StudentEnrollFormWrapper";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { appPath, withBasePath } from "@/lib/basePath";
import { requireStudent } from "@/lib/auth";
import { partitionEnrollmentsByConclusion } from "@/lib/sectionAvailability";

import StudentSectionsPageContentClient from "./StudentSectionsPageContentClient";

export default async function StudentSectionsPage() {
  const user = await requireStudent();

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: {
      section: { with: { course: true } },
    },
  });

  const { active: activeEnrollments, archived: archivedEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);
  const sectionsList = activeEnrollments.map((e) => e.section);

  return (
    <AppShell
      role="student"
      user={user}
      topbarEyebrow="Learner"
      topbarTitle="My sections"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/student") },
          { label: "My sections" },
        ]}
        eyebrow="Enrolment"
        title="Where you're studying."
        description="Every active section you've joined this term, with the courses they belong to and the work assigned to each."
        actions={
          archivedEnrollments.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={appPath("/dashboard/student/sections/archived")}>
                View past sections ({archivedEnrollments.length})
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={appPath("/dashboard/student/sections/archived")}>
                View past sections
              </Link>
            </Button>
          )
        }
      />
      <div className="mt-10">
        <StudentEnrollFormWrapper />
      </div>
      <div className="mt-10">
        <StudentSectionsPageContentClient sectionsList={sectionsList} />
      </div>
    </AppShell>
  );
}
