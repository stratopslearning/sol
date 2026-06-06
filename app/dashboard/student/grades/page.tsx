import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { attempts } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { formatDateTimeStable } from "@/lib/utils";

import StudentGradesTableClient from "./StudentGradesTableClient";

export default async function StudentGradesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    with: {
      quiz: true,
      section: { with: { course: true } },
    },
  });

  const attemptRows = allAttempts.map((a) => ({
    id: a.id,
    quizId: a.quizId,
    sectionId: a.sectionId,
    sectionName: a.section?.name ?? "Section",
    quizTitle: a.quiz?.title ?? "Quiz",
    courseTitle: a.section?.course?.title ?? null,
    submittedAt: a.submittedAt
      ? new Date(a.submittedAt).toISOString()
      : null,
    submittedAtLabel: a.submittedAt
      ? formatDateTimeStable(a.submittedAt)
      : null,
    score: a.score,
    maxScore: a.maxScore,
    percentage: a.percentage,
    passed: a.passed,
  }));

  return (
    <AppShell role="student" user={user} topbarEyebrow="Learner" topbarTitle="My grades">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/student") },
          { label: "My grades" },
        ]}
        eyebrow="Record"
        title="Your gradebook."
        description="Your attempts grouped by section and quiz — best scores, submission dates, and quick access to review each one."
      />
      <div className="mt-10">
        <StudentGradesTableClient attempts={attemptRows} />
      </div>
    </AppShell>
  );
}
