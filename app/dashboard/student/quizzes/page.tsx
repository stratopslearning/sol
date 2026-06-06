import { eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts, quizSections, studentSections } from '@/app/db/schema';
import StudentQuizzesTableClient from './StudentQuizzesTableClient';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  formatDateTimeStable,
  normalizeDatabaseDate,
} from '@/lib/utils';

export default async function StudentQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: { section: true },
  });

  const sectionIds = enrollments.map((e) => e.sectionId);

  const quizAssignments =
    sectionIds.length > 0
      ? await db.query.quizSections.findMany({
          where: inArray(quizSections.sectionId, sectionIds),
          with: {
            quiz: {
              with: {
                sectionAssignments: {
                  with: { section: true },
                },
              },
            },
          },
        })
      : [];

  const assignedQuizzes = quizAssignments
    .map((qa) => qa.quiz)
    .filter(
      (quiz, index, self) =>
        index === self.findIndex((q) => q.id === quiz.id),
    );

  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
  });

  const attemptsByQuiz: Record<string, typeof allAttempts> = {};
  const bestAttemptByQuiz: Record<string, (typeof allAttempts)[0]> = {};
  allAttempts.forEach((a) => {
    if (!attemptsByQuiz[a.quizId]) attemptsByQuiz[a.quizId] = [];
    attemptsByQuiz[a.quizId].push(a);
    if (a.submittedAt == null) return;
    const pct =
      a.percentage ??
      (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    const existing = bestAttemptByQuiz[a.quizId];
    if (!existing) {
      bestAttemptByQuiz[a.quizId] = a;
    } else {
      const existingPct =
        existing.percentage ??
        (existing.maxScore
          ? Math.round(((existing.score ?? 0) / existing.maxScore) * 100)
          : 0);
      if (pct > existingPct) bestAttemptByQuiz[a.quizId] = a;
    }
  });

  const quizzesData = assignedQuizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    endDate: quiz.endDate,
    maxAttempts: quiz.maxAttempts ?? 1,
    sectionNames: (quiz.sectionAssignments ?? [])
      .map((sa) => sa.section?.name)
      .filter((n): n is string => Boolean(n)),
  }));

  const submittedCountByQuizId: Record<string, number> = {};
  const inProgressByQuizId: Record<string, boolean> = {};
  const bestPercentageByQuizId: Record<string, number> = {};
  const latestAttemptIdByQuizId: Record<string, string> = {};
  const isOverdueByQuizId: Record<string, boolean> = {};
  const dueDateLabelByQuizId: Record<string, string> = {};
  const now = new Date();
  assignedQuizzes.forEach((quiz) => {
    const list = attemptsByQuiz[quiz.id] ?? [];
    const submitted = list.filter((a) => a.submittedAt != null);
    submittedCountByQuizId[quiz.id] = submitted.length;
    inProgressByQuizId[quiz.id] = list.some((a) => a.submittedAt == null);
    const best = bestAttemptByQuiz[quiz.id];
    if (best) {
      bestPercentageByQuizId[quiz.id] =
        best.percentage ??
        (best.maxScore ? Math.round(((best.score ?? 0) / best.maxScore) * 100) : 0);
    }
    if (submitted.length > 0) {
      const latest = submitted.reduce((a, b) =>
        new Date(a.submittedAt!).getTime() > new Date(b.submittedAt!).getTime() ? a : b,
      );
      latestAttemptIdByQuizId[quiz.id] = latest.id;
    }
    const endDate = normalizeDatabaseDate(quiz.endDate);
    isOverdueByQuizId[quiz.id] = endDate ? endDate < now : false;
    if (quiz.endDate) {
      dueDateLabelByQuizId[quiz.id] = formatDateTimeStable(quiz.endDate);
    }
  });

  return (
    <AppShell role="student" user={user} topbarEyebrow="Learner" topbarTitle="My quizzes">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/student") },
          { label: "My quizzes" },
        ]}
        eyebrow="Coursework"
        title="Your assigned quizzes."
        description="Everything published to your enrolled sections — sortable, searchable, with attempt tracking."
      />
      <div className="mt-10">
        <StudentQuizzesTableClient
          quizzes={quizzesData}
          submittedCountByQuizId={submittedCountByQuizId}
          inProgressByQuizId={inProgressByQuizId}
          bestPercentageByQuizId={bestPercentageByQuizId}
          latestAttemptIdByQuizId={latestAttemptIdByQuizId}
          isOverdueByQuizId={isOverdueByQuizId}
          dueDateLabelByQuizId={dueDateLabelByQuizId}
        />
      </div>
    </AppShell>
  );
}
