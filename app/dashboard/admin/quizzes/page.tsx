import { db } from "@/app/db";
import { quizzes, sections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { activeOnly } from "@/lib/db/filters";
import { requireAdmin } from "@/lib/auth";
import { partitionBySectionConclusion } from "@/lib/sectionAvailability";
import { formatDateStable } from "@/lib/utils";

import AdminQuizzesPageClient from "./AdminQuizzesPageClient";

export default async function AdminQuizzesPage() {
  await requireAdmin();
  const allSectionsRaw = await db.query.sections.findMany({
    where: activeOnly(sections.deletedAt),
    with: { course: true },
  });
  const { active: ongoingSections } =
    partitionBySectionConclusion(allSectionsRaw);
  const allQuizzesRaw = await db.query.quizzes.findMany({
    where: activeOnly(quizzes.deletedAt),
  });
  const allQuizzes = allQuizzesRaw.map((quiz) => ({
    ...quiz,
    dueDateLabel: formatDateStable(quiz.endDate),
  }));
  const ongoingIds = new Set(ongoingSections.map((s) => s.id));
  const allQuizSections = (await db.query.quizSections.findMany()).filter(
    (qs) => ongoingIds.has(qs.sectionId),
  );

  return (
    <AppShell role="admin" active="quizzes" topbarEyebrow="Administration" topbarTitle="Quizzes">
      <AdminQuizzesPageClient
        allSections={ongoingSections}
        allQuizzes={allQuizzes}
        allQuizSections={allQuizSections}
      />
    </AppShell>
  );
}
