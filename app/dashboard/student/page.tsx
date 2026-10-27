import Link from 'next/link';
import { and, eq, inArray } from 'drizzle-orm';
import {
  ArrowRight,
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
import { requireStudent } from '@/lib/auth';
import { appPath } from '@/lib/basePath';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';
import { isQuizListedForStudents } from '@/lib/quizAvailability';

export default async function StudentDashboard() {
  const user = await requireStudent();

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: { section: { with: { course: true } } },
  });
  const { active: activeEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);

  const sectionIds = activeEnrollments.map((e) => e.sectionId);

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

  const activeQuizzes = availableQuizzes.filter((quiz) =>
    isQuizListedForStudents(quiz),
  );
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

  const totalSections = activeEnrollments.length;
  const totalQuizzes = uniqueActiveQuizzes.length;
  const totalAttempts = submittedOnly.length;
  const averageScore =
    bestPercentages.length > 0
      ? Math.round(
          bestPercentages.reduce((sum, p) => sum + p, 0) /
            bestPercentages.length,
        )
      : 0;

  const firstName = user.firstName || 'there';

  return (
    <AppShell
      role="student"
      user={user}
      topbarTitle="Overview"
    >
      <PageHeader
        title={
          <>
            Welcome back,{' '}
            <em
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
            >
              {firstName}.
            </em>
          </>
        }
        description="Your sections, open work, and recent progress in one place."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
        <StudentEnrollFormWrapper />
        <div className="rounded-xl border border-rule bg-surface-sunken/50 px-5 py-5 sm:px-6">
          <p className="eyebrow">Shortcuts</p>
          <p className="mt-1 font-display text-lg text-ink" style={{ fontVariationSettings: '"opsz" 36' }}>
            Continue studying
          </p>
          <ul className="mt-4 flex flex-col gap-1">
            {[
              {
                href: appPath('/dashboard/student/quizzes'),
                label: 'Quizzes',
                hint: totalQuizzes === 1 ? '1 quiz open' : `${totalQuizzes} quizzes open`,
                icon: FileText,
              },
              {
                href: appPath('/dashboard/student/discussions'),
                label: 'Discussions',
                hint: 'Socratic practice',
                icon: Layers,
              },
              {
                href: appPath('/dashboard/student/grades'),
                label: 'Grades',
                hint: averageScore > 0 ? `${averageScore}% average` : 'View results',
                icon: CheckCircle,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-surface text-ink-muted transition-colors group-hover:border-rule-strong group-hover:text-brand">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {item.label}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {item.hint}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <section className="mt-10 flex flex-col gap-5">
        <SectionHeading
          eyebrow="Progress"
          title="This term at a glance"
          description="Totals across every section you are enrolled in."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Sections"
            value={totalSections}
            icon={<Layers className="h-4 w-4" />}
            hint="Currently enrolled"
            href={appPath('/dashboard/student/sections')}
          />
          <StatCard
            label="Open quizzes"
            value={totalQuizzes}
            icon={<FileText className="h-4 w-4" />}
            hint="Ready to attempt"
            href={appPath('/dashboard/student/quizzes')}
          />
          <StatCard
            label="Attempts"
            value={totalAttempts}
            icon={<CheckCircle className="h-4 w-4" />}
            hint="Submitted so far"
            href={appPath('/dashboard/student/grades')}
          />
          <StatCard
            label="Average"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Best score per quiz"
            accent
            href={appPath('/dashboard/student/grades')}
          />
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Sections"
            title="Where you are enrolled"
            actions={
              <Link
                href={appPath('/dashboard/student/sections')}
                className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                View all
              </Link>
            }
          />
          <div className="overflow-hidden rounded-xl border border-rule bg-surface paper-shadow">
            <EnrollmentList enrollments={activeEnrollments} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Activity"
            title="Recent attempts"
            actions={
              <Link
                href={appPath('/dashboard/student/grades')}
                className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                View grades
              </Link>
            }
          />
          <div className="overflow-hidden rounded-xl border border-rule bg-surface paper-shadow">
            <AttemptList attempts={recentAttempts} />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
