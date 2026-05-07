import { and, eq } from "drizzle-orm";
import { Eye } from "lucide-react";
import { notFound } from "next/navigation";

import { db } from "@/app/db";
import { professorSections, questions, quizzes } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { QuizEditForm } from "@/components/quiz/QuizEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { activeOnly } from "@/lib/db/filters";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { cleanQuizDescription } from "@/lib/utils";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const quiz = await db.query.quizzes.findFirst({
    where: and(
      eq(quizzes.id, quizId),
      eq(quizzes.professorId, user.id),
      activeOnly(quizzes.deletedAt),
    ),
    with: {
      questions: { orderBy: questions.order },
      sectionAssignments: {
        with: { section: { with: { course: true } } },
      },
    },
  });

  if (!quiz) notFound();

  const safeQuestions = quiz.questions.map((q) => ({
    ...q,
    options: Array.isArray(q.options)
      ? q.options
      : typeof q.options === "string"
        ? (() => {
            try {
              const arr = JSON.parse(q.options);
              return Array.isArray(arr) ? arr : null;
            } catch {
              return null;
            }
          })()
        : null,
  }));

  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: { with: { course: true } } },
  });

  const enrolledSections = professorSectionsList.map((ps) => ({
    id: ps.section.id,
    title: `${ps.section.course.title} - ${ps.section.name}`,
    description: ps.section.course.description,
  }));

  const assignedSectionIds = quiz.sectionAssignments.map(
    (sa) => sa.section.id,
  );

  return (
    <AppShell
      role="professor"
      active="quizzes"
      topbarEyebrow="Faculty"
      topbarTitle={quiz.title}
      maxWidth="wide"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "My quizzes",
            href: withBasePath("/dashboard/professor/quizzes"),
          },
          { label: "Edit" },
        ]}
        eyebrow="Revise"
        title={quiz.title}
        description={
          quiz.sectionAssignments.length > 0
            ? `Assigned to ${quiz.sectionAssignments
                .map((sa) => sa.section.name)
                .join(", ")}`
            : "Not yet assigned to a section."
        }
        actions={
          <Button asChild variant="outline">
            <a
              href={withBasePath(
                `/dashboard/professor/quiz/${quiz.id}/results`,
              )}
            >
              <Eye className="h-4 w-4" />
              View results
            </a>
          </Button>
        }
      />

      <section className="mt-12">
        <SectionHeading eyebrow="Specification" title="Quiz at a glance" />
        <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 paper paper-shadow p-6">
          <div>
            <dt className="eyebrow text-ink-faint">Status</dt>
            <dd className="mt-2">
              <Badge variant={quiz.isActive ? "success" : "outline"}>
                {quiz.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Questions</dt>
            <dd className="mt-2 stat-numeral text-2xl text-ink">
              {quiz.questions.length}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Max attempts</dt>
            <dd className="mt-2 stat-numeral text-2xl text-ink">
              {quiz.maxAttempts}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Time limit</dt>
            <dd className="mt-2 stat-numeral text-2xl text-ink">
              {quiz.timeLimit ? `${quiz.timeLimit}m` : "—"}
            </dd>
          </div>
        </dl>
        {quiz.description ? (
          <p className="mt-6 max-w-prose text-ink-muted">
            {cleanQuizDescription(quiz.description)}
          </p>
        ) : null}
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Edit" title="Questions & assignments" />
        <div className="mt-6">
          <QuizEditForm
            quiz={{ ...quiz, questions: safeQuestions }}
            courses={enrolledSections}
            assignedSectionIds={assignedSectionIds}
          />
        </div>
      </section>
    </AppShell>
  );
}
