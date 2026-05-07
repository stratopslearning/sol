import { and, eq, inArray } from 'drizzle-orm';
import {
  CheckCircle,
  FileText,
  Layers,
  TrendingUp,
} from 'lucide-react';

import { db } from '@/app/db';
import { attempts, quizSections, quizzes, studentSections } from '@/app/db/schema';
import { AttemptList } from '@/components/AttemptList';
import { EnrollmentList } from '@/components/EnrollmentList';
import StudentEnrollFormWrapper from '@/components/StudentEnrollFormWrapper';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatCard } from '@/components/patterns/StatCard';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export default async function StudentDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: { section: true },
  });

  const sectionIds = enrollments.map((e) => e.sectionId);

  const availableQuizzes =
    sectionIds.length > 0
      ? await db.query.quizzes.findMany({
          where: and(
            inArray(
              quizzes.id,
              db
                .select({ quizId: quizSections.quizId })
                .from(quizSections)
                .where(inArray(quizSections.sectionId, sectionIds)),
            ),
            activeOnly(quizzes.deletedAt),
          ),
          with: {
            sectionAssignments: {
              with: { section: true },
            },
          },
        })
      : [];

  const activeQuizzes = availableQuizzes.filter((quiz) => quiz.isActive);
  const uniqueActiveQuizzes = activeQuizzes.filter(
    (quiz, index, self) =>
      index === self.findIndex((q) => q.id === quiz.id),
  );

  const allSubmittedAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    with: { quiz: true, section: true },
  });
  const submittedOnly = allSubmittedAttempts.filter(
    (a) => a.submittedAt != null,
  );
  const recentAttempts = [...submittedOnly]
    .sort(
      (a, b) =>
        new Date(b.submittedAt!).getTime() -
        new Date(a.submittedAt!).getTime(),
    )
    .slice(0, 5);

  const bestPerQuiz: Record<string, number> = {};
  submittedOnly.forEach((a) => {
    const pct =
      a.percentage ??
      (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    if (bestPerQuiz[a.quizId] == null || pct > bestPerQuiz[a.quizId]) {
      bestPerQuiz[a.quizId] = pct;
    }
  });
  const bestPercentages = Object.values(bestPerQuiz);

  const totalSections = enrollments.length;
  const totalQuizzes = uniqueActiveQuizzes.length;
  const totalAttempts = submittedOnly.length;
  const averageScore =
    bestPercentages.length > 0
      ? Math.round(
          bestPercentages.reduce((sum, p) => sum + p, 0) /
            bestPercentages.length,
        )
      : 0;

  return (
    <AppShell role="student" user={user} topbarEyebrow="Learner" topbarTitle="Overview">
      <PageHeader
        eyebrow="Learner"
        title={
          <>
            Welcome back,{' '}
            <em
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
            >
              {user.firstName || user.email}.
            </em>
          </>
        }
        description="Pick up where you left off — your active sections, the quizzes that are open, and what you've completed so far."
      />

      <div className="mt-10">
        <StudentEnrollFormWrapper />
      </div>

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading
          eyebrow="Your progress"
          title="The term, in numbers"
          description="A quiet summary across every course you're enrolled in."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Sections"
            value={totalSections}
            icon={<Layers className="h-4 w-4" />}
            hint="Currently enrolled"
          />
          <StatCard
            label="Open quizzes"
            value={totalQuizzes}
            icon={<FileText className="h-4 w-4" />}
            hint="Available to attempt"
          />
          <StatCard
            label="Attempts"
            value={totalAttempts}
            icon={<CheckCircle className="h-4 w-4" />}
            hint="Submitted so far"
          />
          <StatCard
            label="Average"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Best score per quiz"
            accent
          />
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Your sections"
            title="Where you're studying"
          />
          <div className="paper paper-shadow p-1">
            <EnrollmentList enrollments={enrollments} />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Recent attempts"
            title="What you just submitted"
          />
          <div className="paper paper-shadow p-1">
            <AttemptList attempts={recentAttempts} />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
