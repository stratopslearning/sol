import { eq, inArray } from "drizzle-orm";
import { Clock, FileText, Plus, TrendingUp, Users } from "lucide-react";

import { db } from "@/app/db";
import { professorSections, quizSections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { StatCard } from "@/components/patterns/StatCard";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { formatDateStable } from "@/lib/utils";

import ProfessorQuizzesTableClient from "./ProfessorQuizzesTableClient";

export default async function ProfessorQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: true },
  });

  const enrolledSectionIds = professorEnrollments.map((e) => e.sectionId);

  const sectionQuizzes = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, enrolledSectionIds),
    with: {
      quiz: {
        with: {
          sectionAssignments: { with: { section: true } },
          attempts: true,
          questions: true,
          professor: true,
        },
      },
    },
    orderBy: (quizSections, { desc }) => desc(quizSections.assignedAt),
  });

  const seenQuizIds = new Set<string>();
  const uniqueQuizzes = sectionQuizzes
    .map((qs) => qs.quiz)
    .filter((quiz) => {
      if (seenQuizIds.has(quiz.id)) return false;
      seenQuizIds.add(quiz.id);
      return true;
    });

  const quizzesWithStats = uniqueQuizzes.map((quiz) => {
    const isCreatedByProfessor = quiz.professorId === user.id;
    const submitted = quiz.attempts.filter((a) => a.submittedAt != null);
    const totalAttempts = submitted.length;
    const uniqueStudents = new Set(submitted.map((a) => a.studentId)).size;
    const bestPerStudent: Record<string, number> = {};
    submitted.forEach((a) => {
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
    const averageScore =
      bestPercentages.length > 0
        ? Math.round(
            bestPercentages.reduce((sum, p) => sum + p, 0) /
              bestPercentages.length,
          )
        : 0;

    return {
      ...quiz,
      isCreatedByProfessor,
      submittedAttempts: submitted,
      totalAttempts,
      uniqueStudents,
      averageScore,
      dueDateLabel: formatDateStable(quiz.endDate),
      createdDateLabel: formatDateStable(quiz.createdAt),
    };
  });

  const totalAttempts = quizzesWithStats.reduce(
    (sum, q) => sum + q.totalAttempts,
    0,
  );
  const activeStudents = new Set(
    quizzesWithStats.flatMap((q) =>
      q.submittedAttempts.map((a) => a.studentId),
    ),
  ).size;
  const avgPerformance =
    quizzesWithStats.length > 0
      ? Math.round(
          quizzesWithStats.reduce((sum, q) => sum + q.averageScore, 0) /
            quizzesWithStats.length,
        )
      : 0;

  return (
    <AppShell
      role="professor"
      active="quizzes"
      topbarEyebrow="Faculty"
      topbarTitle="My quizzes"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          { label: "My quizzes" },
        ]}
        eyebrow="Coursework"
        title="Your quiz library."
        description="Every quiz assigned to a section you teach — created by you or shared with you."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href={withBasePath("/dashboard/professor/quiz-results")}>
                <TrendingUp className="h-4 w-4" />
                All results
              </a>
            </Button>
            <Button asChild>
              <a href={withBasePath("/dashboard/professor/quiz/new")}>
                <Plus className="h-4 w-4" />
                Compose quiz
              </a>
            </Button>
          </div>
        }
      />

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading
          eyebrow="At a glance"
          title="How your quizzes are performing"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Quizzes"
            value={quizzesWithStats.length}
            icon={<FileText className="h-4 w-4" />}
            hint="Across your sections"
          />
          <StatCard
            label="Submissions"
            value={totalAttempts}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Total attempts"
          />
          <StatCard
            label="Active learners"
            value={activeStudents}
            icon={<Users className="h-4 w-4" />}
            hint="Have submitted"
          />
          <StatCard
            label="Average"
            value={`${avgPerformance}%`}
            icon={<Clock className="h-4 w-4" />}
            hint="Class performance"
            accent
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Library" title="All quizzes" />
        <div className="mt-6">
          <ProfessorQuizzesTableClient
            quizzesWithStats={quizzesWithStats}
            sections={professorEnrollments.map((e) => ({
              id: e.section.id,
              name: e.section.name,
            }))}
          />
        </div>
      </section>
    </AppShell>
  );
}
