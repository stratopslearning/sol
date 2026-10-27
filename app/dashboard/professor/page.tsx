import Link from 'next/link';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  KeyRound,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react';

import { db } from '@/app/db';
import {
  attempts,
  professorSections,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import ExportResultsWrapper from '@/components/ExportResultsWrapper';
import ProfessorEnrollForm from '@/components/ProfessorEnrollForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { StatCard } from '@/components/patterns/StatCard';
import { QuickRegradeButton } from '@/components/quiz/QuickRegradeButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { activeOnly } from '@/lib/db/filters';
import { appPath, withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';

export default async function ProfessorDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: { with: { course: true } },
    },
  });
  const { active: ongoingEnrollments } =
    partitionEnrollmentsByConclusion(professorEnrollments);

  const sectionIds = ongoingEnrollments.map((e) => e.sectionId);

  const sectionQuizLinks =
    sectionIds.length > 0
      ? await db.query.quizSections.findMany({
          where: inArray(quizSections.sectionId, sectionIds),
        })
      : [];
  const assignedQuizIds = [
    ...new Set(sectionQuizLinks.map((qs) => qs.quizId)),
  ];

  const professorQuizzes =
    assignedQuizIds.length > 0
      ? await db.query.quizzes.findMany({
          where: and(
            inArray(quizzes.id, assignedQuizIds),
            activeOnly(quizzes.deletedAt),
          ),
          with: {
            sectionAssignments: {
              with: { section: { with: { course: true } } },
            },
          },
        })
      : [];

  const attentionItems = await getAttentionItemsForProfessor(user.id, {
    limit: 8,
  });
  const attentionTotalPreview = attentionItems.reduce(
    (s, i) => s + i.needsAttentionCount,
    0,
  );

  const recentAttempts =
    professorQuizzes.length > 0 && sectionIds.length > 0
      ? await db.query.attempts.findMany({
          where: and(
            inArray(
              attempts.quizId,
              professorQuizzes.map((q) => q.id),
            ),
            isNotNull(attempts.submittedAt),
            inArray(attempts.sectionId, sectionIds),
          ),
          with: {
            student: true,
            quiz: true,
            section: { with: { course: true } },
          },
          orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
          limit: 5,
        })
      : [];

  const submittedAttemptsList =
    professorQuizzes.length > 0 && sectionIds.length > 0
      ? await db.query.attempts.findMany({
          where: and(
            inArray(
              attempts.quizId,
              professorQuizzes.map((q) => q.id),
            ),
            isNotNull(attempts.submittedAt),
            inArray(attempts.sectionId, sectionIds),
          ),
          columns: {
            studentId: true,
            quizId: true,
            percentage: true,
            score: true,
            maxScore: true,
          },
        })
      : [];

  const totalSections = ongoingEnrollments.length;
  const activeQuizzes = professorQuizzes.filter((q) => q.isActive).length;
  const bestPerStudentQuiz: Record<string, number> = {};
  submittedAttemptsList.forEach((a) => {
    const key = `${a.studentId}:${a.quizId}`;
    const pct =
      a.percentage ??
      (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    if (bestPerStudentQuiz[key] == null || pct > bestPerStudentQuiz[key]) {
      bestPerStudentQuiz[key] = pct;
    }
  });
  const bestPercentages = Object.values(bestPerStudentQuiz);
  const averageScore =
    bestPercentages.length > 0
      ? Math.round(
          bestPercentages.reduce((sum, p) => sum + p, 0) /
            bestPercentages.length,
        )
      : 0;

  const deskSections = ongoingEnrollments.slice(0, 6);
  const firstName = user.firstName || user.email;

  const shortcuts = [
    {
      href: appPath('/dashboard/professor/quiz/new'),
      label: 'New quiz',
      hint: 'Scored assignment',
      icon: Plus,
    },
    {
      href: appPath('/dashboard/professor/discussions'),
      label: 'Discussions',
      hint: 'Socratic sessions',
      icon: FileText,
    },
    {
      href: appPath('/dashboard/professor/attention'),
      label: 'Attention queue',
      hint:
        attentionTotalPreview > 0
          ? `${attentionTotalPreview} waiting`
          : 'Queue clear',
      icon: AlertTriangle,
    },
    {
      href: appPath('/dashboard/professor/quiz-results'),
      label: 'Results',
      hint: 'Section performance',
      icon: TrendingUp,
    },
  ];

  return (
    <AppShell role="professor" topbarTitle="Overview">
      <PageHeader
        title={
          <>
            {firstName}
            <span className="text-ink-muted font-normal">’s desk</span>
          </>
        }
        description="See your sections, attention queue, and recent work in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <a href={withBasePath('/dashboard/professor/quiz/new')}>
                <Plus className="h-4 w-4" />
                New quiz
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={withBasePath('/dashboard/professor/attention')}>
                <AlertTriangle className="h-4 w-4" />
                Attention
                {attentionTotalPreview > 0 ? (
                  <Badge variant="warning" className="ml-1">
                    {attentionTotalPreview}
                  </Badge>
                ) : null}
              </a>
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
        <ProfessorEnrollForm />
        <div className="rounded-xl border border-rule bg-surface-sunken/50 px-5 py-5 sm:px-6">
          <p className="eyebrow">Shortcuts</p>
          <p
            className="mt-1 font-display text-lg text-ink"
            style={{ fontVariationSettings: '"opsz" 36' }}
          >
            Keep teaching moving
          </p>
          <ul className="mt-4 flex flex-col gap-1">
            {shortcuts.map((item) => {
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
          description="Totals across the sections you teach."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Sections"
            value={totalSections}
            icon={<Layers className="h-4 w-4" />}
            hint="Active this term"
            href="/dashboard/professor/sections"
          />
          <StatCard
            label="Live quizzes"
            value={activeQuizzes}
            icon={<FileText className="h-4 w-4" />}
            hint="Open scored work"
            href="/dashboard/professor/quizzes"
          />
          <StatCard
            label="Attention"
            value={attentionTotalPreview}
            icon={<AlertTriangle className="h-4 w-4" />}
            hint={attentionTotalPreview > 0 ? 'Needs review' : 'Queue clear'}
            href="/dashboard/professor/attention"
            accent={attentionTotalPreview > 0}
          />
          <StatCard
            label="Average"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Best per learner per quiz"
            href="/dashboard/professor/quiz-results"
          />
        </div>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <SectionHeading
          eyebrow="Needs attention"
          title={
            attentionTotalPreview > 0
              ? attentionTotalPreview === 1
                ? '1 response waiting'
                : `${attentionTotalPreview} responses waiting`
              : 'Queue clear'
          }
          actions={
            <Link
              href={appPath('/dashboard/professor/attention')}
              className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Open queue
            </Link>
          }
        />
        {attentionItems.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-rule bg-surface paper-shadow divide-y divide-rule">
            {attentionItems.map((item) => {
              const fullName =
                `${item.student.firstName ?? ''} ${item.student.lastName ?? ''}`.trim() ||
                item.student.email ||
                'Unknown';
              return (
                <li
                  key={item.attemptId}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning-fg shrink-0" />
                      <span className="text-sm font-medium text-ink truncate">
                        {fullName}
                      </span>
                      <span className="text-xs text-ink-faint truncate">
                        · {item.quiz.title}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted truncate mt-0.5 ml-5">
                      {item.section.name}
                      {item.section.course
                        ? ` · ${item.section.course.title}`
                        : ''}
                      {' · '}
                      {item.manualReviewCount > 0
                        ? `${item.manualReviewCount} manual review`
                        : null}
                      {item.manualReviewCount > 0 && item.pendingCount > 0
                        ? ', '
                        : ''}
                      {item.pendingCount > 0
                        ? `${item.pendingCount} pending`
                        : null}
                      {(item.manualReviewCount > 0 || item.pendingCount > 0) &&
                      item.legacyFallbackCount > 0
                        ? ', '
                        : ''}
                      {item.legacyFallbackCount > 0
                        ? `${item.legacyFallbackCount} legacy fallback`
                        : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={withBasePath(
                          `/dashboard/professor/attempt/${item.attemptId}`,
                        )}
                      >
                        View
                      </a>
                    </Button>
                    <QuickRegradeButton attemptId={item.attemptId} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted px-1">
            Nothing needs review right now.{' '}
            <a
              href={withBasePath('/dashboard/professor/attention')}
              className="text-brand underline underline-offset-4 decoration-brand-soft hover:decoration-brand"
            >
              Open the full queue
            </a>
            .
          </p>
        )}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Sections"
            title="Where you teach"
            actions={
              <Link
                href={appPath('/dashboard/professor/sections')}
                className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                View all
              </Link>
            }
          />
          {deskSections.length > 0 ? (
            <ul className="overflow-hidden rounded-xl border border-rule bg-surface paper-shadow divide-y divide-rule">
              {deskSections.map((enrollment) => {
                const section = enrollment.section;
                return (
                  <li
                    key={enrollment.sectionId}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink truncate">
                        {section.course?.title ?? 'Course'}
                      </div>
                      <div className="text-xs text-ink-muted truncate mt-0.5">
                        {section.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={withBasePath(
                            `/dashboard/professor/sections/${section.id}/gradebook`,
                          )}
                        >
                          Gradebook
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={withBasePath(
                            `/dashboard/professor/sections/${section.id}`,
                          )}
                        >
                          Details
                        </a>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted px-1">
              No active sections yet. Join one with an enrollment code above.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Activity"
            title="Recent submissions"
            actions={
              <Link
                href={appPath('/dashboard/professor/quiz-results')}
                className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                View results
              </Link>
            }
          />
          {recentAttempts.length > 0 ? (
            <ul className="overflow-hidden rounded-xl border border-rule bg-surface paper-shadow divide-y divide-rule">
              {recentAttempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink truncate">
                      {attempt.student.firstName} {attempt.student.lastName}
                    </div>
                    <div className="text-xs text-ink-muted truncate mt-0.5">
                      {attempt.quiz.title} · {attempt.section.course.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tnum text-sm text-ink">
                      {attempt.percentage ?? 0}%
                    </span>
                    <Badge variant={attempt.passed ? 'success' : 'destructive'}>
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted px-1">
              No submissions yet. They’ll appear here as learners finish quizzes.
            </p>
          )}
        </div>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <SectionHeading
          eyebrow="Export"
          title="Download results"
          description="CSV export for the quizzes assigned to your sections."
          actions={
            <Link
              href={appPath('/dashboard/professor/agent-access')}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Agent access
            </Link>
          }
        />
        <div className="rounded-xl border border-rule bg-surface paper-shadow p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink-muted">
            <Download className="h-4 w-4" />
            <span className="text-sm">Download quiz results as CSV</span>
          </div>
          <ExportResultsWrapper quizzes={professorQuizzes} />
        </div>
      </section>
    </AppShell>
  );
}
