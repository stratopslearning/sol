import Link from "next/link";

import { db } from "@/app/db";
import { sections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuizCreationForm } from "@/components/quiz/QuizCreationForm";
import { Toaster } from "@/components/ui/sonner";
import { activeOnly } from "@/lib/db/filters";
import { withBasePath } from "@/lib/basePath";
import { requireAdmin } from "@/lib/auth";

export default async function AdminQuizNewPage() {
  await requireAdmin();
  const allSections = await db.query.sections.findMany({
    where: activeOnly(sections.deletedAt),
    with: { course: true },
  });
  const courseOptions = allSections.map((section) => ({
    id: section.id,
    title: `${section.name} (${section.course?.title || "Unknown"})`,
  }));

  return (
    <AppShell role="admin" active="quizzes" maxWidth="wide">
      <Toaster />
      <PageHeader
        eyebrow="New quiz"
        title="Create a quiz"
        description="Author questions, set timing rules, and publish to a section."
        breadcrumbs={[
          { label: "Quizzes", href: withBasePath("/dashboard/admin/quizzes") },
          { label: "New" },
        ]}
      />
      <div className="mt-8">
        <QuizCreationForm
          courses={courseOptions}
          apiEndpoint="/api/admin/quiz/create"
        />
      </div>
      <div className="mt-10">
        <Link
          href="/dashboard/admin/quizzes"
          className="text-sm text-ink-muted hover:text-brand transition-colors"
        >
          ← Back to quizzes
        </Link>
      </div>
    </AppShell>
  );
}
