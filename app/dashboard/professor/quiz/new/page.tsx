import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { professorSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuizCreationForm } from "@/components/quiz/QuizCreationForm";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export default async function CreateQuizPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: { with: { course: true } } },
  });

  const enrolledSections = professorSectionsList.map((ps) => ({
    id: ps.section.id,
    title: `${ps.section.course.title} - ${ps.section.name}`,
    description: ps.section.course.description,
  }));

  return (
    <AppShell
      role="professor"
      active="quizzes"
      topbarEyebrow="Faculty"
      topbarTitle="Compose quiz"
      maxWidth="narrow"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "My quizzes",
            href: withBasePath("/dashboard/professor/quizzes"),
          },
          { label: "Compose" },
        ]}
        eyebrow="Compose"
        title="Set a new quiz."
        description="Author the questions, choose the sections it should appear in, and publish when you're ready."
      />
      <div className="mt-12">
        <QuizCreationForm courses={enrolledSections} />
      </div>
    </AppShell>
  );
}
