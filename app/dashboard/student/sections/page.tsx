import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { studentSections } from "@/app/db/schema";
import StudentEnrollFormWrapper from "@/components/StudentEnrollFormWrapper";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

import StudentSectionsPageContentClient from "./StudentSectionsPageContentClient";

export default async function StudentSectionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "STUDENT") return null;

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: {
      section: { with: { course: true } },
    },
  });

  const sectionsList = enrollments.map((e) => e.section);

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
        description="Every section you've joined this term, with the courses they belong to and the work assigned to each."
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
