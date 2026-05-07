import { and, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { appRedirect } from "@/lib/serverRedirect";

import { db } from "@/app/db";
import {
  attempts,
  professorSections,
  quizSections,
  sections,
  studentSections,
} from "@/app/db/schema";
import ExportResultsWrapper from "@/components/ExportResultsWrapper";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { EmptyState } from "@/components/patterns/EmptyState";
import { requireAuth } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";
import { activeOnly } from "@/lib/db/filters";

export default async function SectionGradebookPage({ params }: any) {
  const { sectionId } = await params;

  const me = await requireAuth();
  if (me.role !== "PROFESSOR" && me.role !== "ADMIN") {
    appRedirect("/unauthorized");
  }

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    with: { course: true },
  });
  if (!section) return notFound();

  if (me.role !== "ADMIN") {
    const enrollment = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, me.id),
      ),
    });
    if (!enrollment) return notFound();
  }

  const studentEnrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.sectionId, sectionId),
    with: { student: true },
  });
  const students = studentEnrollments.map((e) => e.student);

  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizSectionAssignments.map((qs) => qs.quiz);
  const quizIds = sectionQuizzes.map((q) => q.id);

  const studentIds = students.map((s) => s.id);
  let allAttempts: any[] = [];
  if (studentIds.length && quizIds.length) {
    const raw = await db.query.attempts.findMany({
      where: and(
        inArray(attempts.studentId, studentIds),
        inArray(attempts.quizId, quizIds),
      ),
      with: { student: true, quiz: true },
    });
    allAttempts = raw.filter((a) => a.submittedAt != null);
  }

  const studentQuizScores: Record<
    string,
    Record<
      string,
      { score: number; percentage: number; attemptId: string; maxScore: number }
    >
  > = {};
  allAttempts.forEach((attempt) => {
    const pct =
      attempt.percentage ??
      (attempt.maxScore
        ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
        : 0);
    const score = attempt.score ?? 0;
    if (!studentQuizScores[attempt.studentId]) {
      studentQuizScores[attempt.studentId] = {};
    }
    const existing = studentQuizScores[attempt.studentId][attempt.quizId];
    if (
      !existing ||
      pct > (existing.percentage ?? 0) ||
      (pct === (existing.percentage ?? 0) && score > existing.score)
    ) {
      studentQuizScores[attempt.studentId][attempt.quizId] = {
        score: attempt.score ?? 0,
        percentage: pct,
        attemptId: attempt.id,
        maxScore: attempt.maxScore ?? 0,
      };
    }
  });

  const quizAverages = sectionQuizzes.map((quiz) => {
    const bestPercentages: number[] = [];
    students.forEach((s) => {
      const best = studentQuizScores[s.id]?.[quiz.id];
      if (best != null) bestPercentages.push(best.percentage);
    });
    const avg =
      bestPercentages.length > 0
        ? Math.round(
            bestPercentages.reduce((a, b) => a + b, 0) / bestPercentages.length,
          )
        : 0;
    return { quizId: quiz.id, average: avg };
  });

  return (
    <AppShell
      role="professor"
      active="sections"
      topbarEyebrow="Faculty"
      topbarTitle="Gradebook"
      maxWidth="wide"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "My sections",
            href: withBasePath("/dashboard/professor/sections"),
          },
          {
            label: section.name,
            href: withBasePath(
              `/dashboard/professor/sections/${section.id}`,
            ),
          },
          { label: "Gradebook" },
        ]}
        eyebrow="Gradebook"
        title={`${section.name} grades`}
        description={
          section.course
            ? `${section.course.title} · ${students.length} learners · ${sectionQuizzes.length} quizzes`
            : `${students.length} learners · ${sectionQuizzes.length} quizzes`
        }
        actions={
          sectionQuizzes.length > 0 ? (
            <ExportResultsWrapper
              quizzes={sectionQuizzes.map((q) => ({
                id: q.id,
                title: q.title,
              }))}
            />
          ) : undefined
        }
      />

      <section className="mt-12">
        <SectionHeading eyebrow="Matrix" title="Best score per learner" />
        <div className="mt-6">
          {students.length === 0 || sectionQuizzes.length === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title={
                students.length === 0
                  ? "No learners enrolled."
                  : "No quizzes assigned to this section."
              }
              description={
                students.length === 0
                  ? "Share the learner enrolment code on the section detail page."
                  : "Assign at least one quiz to start collecting grades."
              }
            />
          ) : (
            <div className="paper paper-shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-sunken/40 border-b border-rule">
                    <th className="px-4 py-3 text-left eyebrow text-ink-faint">
                      Learner
                    </th>
                    {sectionQuizzes.map((quiz) => (
                      <th
                        key={quiz.id}
                        className="px-4 py-3 text-left eyebrow text-ink-faint min-w-[140px]"
                      >
                        {quiz.title}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right eyebrow text-ink-faint">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {students.map((student) => {
                    const bestPercentages = sectionQuizzes
                      .map(
                        (quiz) =>
                          studentQuizScores[student.id]?.[quiz.id]?.percentage,
                      )
                      .filter((p): p is number => p != null);
                    const studentAvg =
                      bestPercentages.length > 0
                        ? Math.round(
                            bestPercentages.reduce((a, b) => a + b, 0) /
                              bestPercentages.length,
                          )
                        : null;
                    return (
                      <tr key={student.id} className="hover:bg-surface-sunken/40">
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-xs text-ink-faint">
                              {student.email}
                            </span>
                          </div>
                        </td>
                        {sectionQuizzes.map((quiz) => {
                          const cell =
                            studentQuizScores[student.id]?.[quiz.id];
                          return (
                            <td
                              key={quiz.id}
                              className="px-4 py-3 tnum text-ink"
                            >
                              {cell ? (
                                <div className="flex flex-col">
                                  <span>{cell.percentage}%</span>
                                  <span className="text-xs text-ink-faint">
                                    {cell.score}/{cell.maxScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-ink-faint">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right tnum">
                          {studentAvg != null ? (
                            <span className="font-display text-lg text-ink">
                              {studentAvg}%
                            </span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-rule-strong bg-surface-sunken/40">
                    <td className="px-4 py-3 eyebrow text-ink-muted">
                      Quiz average
                    </td>
                    {quizAverages.map((q) => (
                      <td
                        key={q.quizId}
                        className="px-4 py-3 tnum font-display text-ink"
                      >
                        {q.average}%
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-ink-faint">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
