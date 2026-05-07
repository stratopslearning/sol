import { db } from "@/app/db";
import { quizzes, sections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { activeOnly } from "@/lib/db/filters";
import { requireAdmin } from "@/lib/auth";

import AdminQuizzesPageClient from "./AdminQuizzesPageClient";

export default async function AdminQuizzesPage() {
  await requireAdmin();
  const allSections = await db.query.sections.findMany({
    where: activeOnly(sections.deletedAt),
    with: { course: true },
  });
  const allQuizzes = await db.query.quizzes.findMany({
    where: activeOnly(quizzes.deletedAt),
  });
  const allQuizSections = await db.query.quizSections.findMany();

  return (
    <AppShell role="admin" active="quizzes" topbarEyebrow="Administration" topbarTitle="Quizzes">
      <AdminQuizzesPageClient
        allSections={allSections}
        allQuizzes={allQuizzes}
        allQuizSections={allQuizSections}
      />
    </AppShell>
  );
}
