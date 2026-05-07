import { and, eq, inArray } from "drizzle-orm";
import {
  CheckCircle,
  Eye,
  FileText,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { notFound } from "next/navigation";

import { db } from "@/app/db";
import {
  attempts,
  professorSections,
  questions,
  quizSections,
} from "@/app/db/schema";
import ExportResultsWrapper from "@/components/ExportResultsWrapper";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatCard } from "@/components/patterns/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export default async function QuizResultsPage({
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

  const enrolledSectionIds = professorSectionsList.map((ps) => ps.section.id);
  if (enrolledSectionIds.length === 0) notFound();

  const quizAssignment = await db.query.quizSections.findFirst({
    where: and(
      eq(quizSections.quizId, quizId),
      inArray(quizSections.sectionId, enrolledSectionIds),
    ),
    with: {
      quiz: {
        with: {
          professor: true,
          questions: { orderBy: questions.order },
          sectionAssignments: {
            with: { section: { with: { course: true } } },
          },
        },
      },
    },
  });

  if (!quizAssignment) notFound();
  const quiz = quizAssignment.quiz;
  if (!quiz) notFound();

  // Scope attempts to sections the caller actually teaches. Without this,
  // a co-teaching professor could see attempts from another section even when
  // they are only enrolled in one of the quiz's assigned sections.
  const allQuizAttempts = await db.query.attempts.findMany({
    where: and(
      eq(attempts.quizId, quizId),
      inArray(attempts.sectionId, enrolledSectionIds),
    ),
    with: {
      student: true,
      section: { with: { course: true } },
    },
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
  });
  const quizAttempts = allQuizAttempts.filter((a) => a.submittedAt != null);

  const bestPerStudent: Record<string, number> = {};
  quizAttempts.forEach((a) => {
    const pct =
      a.percentage ??
      (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    if (
      bestPerStudent[a.studentId] == null ||
      pct > bestPerStudent[a.studentId]
    ) {
      bestPerStudent[a.studentId] = pct;
    }
  });
  const bestPercentages = Object.values(bestPerStudent);

  const totalAttempts = quizAttempts.length;
  const uniqueStudents = new Set(quizAttempts.map((a) => a.studentId)).size;
  const averageScore =
    bestPercentages.length > 0
      ? Math.round(
          bestPercentages.reduce((sum, p) => sum + p, 0) /
            bestPercentages.length,
        )
      : 0;

  const questionStats = quiz.questions.map((question) => {
    const questionAttempts = quizAttempts.filter(
      (a) =>
        a.answers &&
        typeof a.answers === "string" &&
        JSON.parse(a.answers).some((ans: any) => ans.questionId === question.id),
    );

    const correctAnswers = questionAttempts.filter((a) => {
      const answers = JSON.parse(a.answers as string);
      const answer = answers.find((ans: any) => ans.questionId === question.id);
      return answer && answer.isCorrect;
    }).length;

    const questionSuccessRate =
      questionAttempts.length > 0
        ? Math.round((correctAnswers / questionAttempts.length) * 100)
        : 0;

    return {
      ...question,
      attempts: questionAttempts.length,
      correctAnswers,
      successRate: questionSuccessRate,
    };
  });

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
          { label: "Results" },
        ]}
        eyebrow="Results"
        title={quiz.title}
        description={
          quiz.sectionAssignments.length > 0
            ? `Aggregated results across ${quiz.sectionAssignments
                .map((sa) => sa.section.name)
                .join(", ")}.`
            : "Aggregated results across all assigned sections."
        }
        actions={
          <ExportResultsWrapper
            quizzes={[{ id: quiz.id, title: quiz.title }]}
          />
        }
      />

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading eyebrow="Performance" title="Summary metrics" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Submissions"
            value={totalAttempts}
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCard
            label="Learners"
            value={uniqueStudents}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Average"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            accent
          />
          <StatCard
            label="Questions"
            value={quiz.questions.length}
            hint={`${quiz.maxAttempts} max attempts`}
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Submissions" title="Per-attempt detail" />
        {quizAttempts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              eyebrow="Empty"
              title="No attempts yet."
              description="Once learners submit, individual attempts will appear here."
            />
          </div>
        ) : (
          <div className="mt-6 paper paper-shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="tnum">Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">
                          {attempt.student.firstName} {attempt.student.lastName}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {attempt.student.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-ink-muted">
                      {attempt.section?.name || "—"}
                      {attempt.section?.course?.title ? (
                        <span className="text-ink-faint">
                          {" · "}
                          {attempt.section.course.title}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tnum">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-ink">
                          {attempt.percentage}%
                        </span>
                        <span className="text-xs text-ink-faint">
                          {attempt.score}/{attempt.maxScore}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {attempt.passed ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-ink-muted tnum">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={withBasePath(
                            `/dashboard/professor/attempt/${attempt.id}`,
                          )}
                          aria-label="View attempt"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Diagnostic"
          title="Question-by-question analysis"
        />
        {questionStats.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              eyebrow="Empty"
              title="No questions found."
            />
          </div>
        ) : (
          <div className="mt-6 paper paper-shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="tnum">Attempts</TableHead>
                  <TableHead className="tnum">Success</TableHead>
                  <TableHead className="tnum">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionStats.map((question, index) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1 max-w-prose">
                        <span className="eyebrow text-ink-faint">
                          Q{index + 1}
                        </span>
                        <span className="text-ink line-clamp-2">
                          {question.question}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {question.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="tnum">{question.attempts}</TableCell>
                    <TableCell className="tnum">
                      <div className="flex flex-col">
                        <span className="font-display text-lg text-ink">
                          {question.successRate}%
                        </span>
                        <span className="text-xs text-ink-faint">
                          {question.correctAnswers}/{question.attempts}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tnum">{question.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
