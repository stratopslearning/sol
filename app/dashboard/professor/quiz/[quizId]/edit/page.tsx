import { and, eq } from "drizzle-orm";
import { Copy, Eye, ShieldCheck } from "lucide-react";
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

import { CreateEditableCopyButton } from "./CreateEditableCopyButton";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: { with: { course: true } } },
  });
  const enrolledSectionIds = new Set(
    professorSectionsList.map((ps) => ps.section.id),
  );

  const quiz = await db.query.quizzes.findFirst({
    where: and(
      eq(quizzes.id, quizId),
      activeOnly(quizzes.deletedAt),
    ),
    with: {
      professor: true,
      questions: { orderBy: questions.order },
      sectionAssignments: {
        with: { section: { with: { course: true } } },
      },
    },
  });

  if (!quiz) notFound();

  const isOwner = quiz.professorId === user.id;
  const editableSectionAssignments = quiz.sectionAssignments.filter((sa) =>
    enrolledSectionIds.has(sa.section.id),
  );

  if (!isOwner && editableSectionAssignments.length === 0) notFound();

  if (!isOwner) {
    const editableSectionNames = editableSectionAssignments
      .map((sa) => sa.section.name)
      .join(", ");

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
            { label: "Edit copy" },
          ]}
          eyebrow="Shared quiz"
          title={quiz.title}
          description={`This quiz was created by ${
            quiz.professor?.email ?? "another instructor"
          }. Create a section-specific copy before editing questions, dates, or settings.`}
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

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="paper paper-shadow p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Copy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="eyebrow text-ink-faint">Section copy</span>
                <h2 className="mt-2 font-display text-2xl text-ink">
                  Make this quiz editable for your section.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                  Admin-created quizzes can be shared across many sections. To
                  protect other classes, SOL will create a professor-owned copy
                  and move only your enrolled section assignments onto it.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {editableSectionAssignments.map((assignment) => (
                    <Badge key={assignment.section.id} variant="info">
                      {assignment.section.course.title} · {assignment.section.name}
                    </Badge>
                  ))}
                </div>
                <div className="mt-8">
                  <CreateEditableCopyButton quizId={quiz.id} />
                </div>
              </div>
            </div>
          </div>

          <aside className="paper paper-shadow p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-ink-faint" />
              <div>
                <span className="eyebrow text-ink-faint">What changes</span>
                <h3 className="font-display text-lg text-ink">
                  Only your section moves.
                </h3>
              </div>
            </div>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="eyebrow text-ink-faint">Your sections</dt>
                <dd className="mt-1 text-ink">{editableSectionNames}</dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-faint">Original quiz</dt>
                <dd className="mt-1 text-ink-muted">
                  Stays assigned to sections you do not teach.
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-faint">After copying</dt>
                <dd className="mt-1 text-ink-muted">
                  You can edit title, questions, dates, attempts, and status on
                  the new copy.
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </AppShell>
    );
  }

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
