import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Download,
  FileText,
  Layers,
  Plus,
  TrendingUp,
  Users,
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
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { QuickRegradeButton } from '@/components/quiz/QuickRegradeButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { activeOnly } from '@/lib/db/filters';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';

export default async function ProfessorDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: { with: { course: true } },
    },
  });

  const sectionIds = professorEnrollments.map((e) => e.sectionId);

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
            attempts: true,
          },
        })
      : [];

  const attentionItems = await getAttentionItemsForProfessor(user.id, {
    limit: 5,
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
            quiz: {
              with: {
                sectionAssignments: {
                  with: { section: { with: { course: true } } },
                },
              },
            },
            section: { with: { course: true } },
          },
          orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
          limit: 5,
        })
      : [];

  const totalSections = professorEnrollments.length;
  const activeQuizzes = professorQuizzes.filter((q) => q.isActive).length;
  const draftQuizzes = professorQuizzes.filter((q) => !q.isActive).length;
  const submittedAttemptsList = professorQuizzes.flatMap((q) =>
    q.attempts.filter((a) => a.submittedAt != null),
  );
  const totalStudents = new Set(submittedAttemptsList.map((a) => a.studentId))
    .size;
  const totalAttempts = submittedAttemptsList.length;
  const bestPerStudentQuiz: Record<string, number> = {};
  submittedAttemptsList.forEach((a) => {
    const key = `${a.studentId}:${a.quizId}`;
    const pct =
      a.percentage ??
      (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    if (
      bestPerStudentQuiz[key] == null ||
      pct > bestPerStudentQuiz[key]
    ) {
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

  return (
    <AppShell role="professor" topbarEyebrow="Faculty" topbarTitle="Overview">
      <PageHeader
        eyebrow="Faculty"
        title={
          <>
            Good to see you,{' '}
            <em
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
            >
              {user.firstName || user.email}.
            </em>
          </>
        }
        description="Your sections, your quizzes, and the work waiting for you today."
        actions={
          <Button asChild>
            <a href={withBasePath('/dashboard/professor/quiz/new')}>
              <Plus className="h-4 w-4" />
              Compose quiz
            </a>
          </Button>
        }
      />

      <div className="mt-10">
        <ProfessorEnrollForm />
      </div>

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading
          eyebrow="At a glance"
          title="The term, in numbers"
          description="Aggregated across all the sections assigned to you."
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Sections"
            value={totalSections}
            icon={<Layers className="h-4 w-4" />}
            hint="You teach"
          />
          <StatCard
            label="Live quizzes"
            value={activeQuizzes}
            icon={<FileText className="h-4 w-4" />}
            hint="Open to learners"
          />
          <StatCard
            label="Drafts"
            value={draftQuizzes}
            icon={<FileText className="h-4 w-4" />}
            hint="Not yet published"
          />
          <StatCard
            label="Students"
            value={totalStudents}
            icon={<Users className="h-4 w-4" />}
            hint="Have attempted"
          />
          <StatCard
            label="Submissions"
            value={totalAttempts}
            icon={<CheckCircle className="h-4 w-4" />}
            hint="All time"
          />
          <StatCard
            label="Average"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Best per learner per quiz"
            accent
          />
        </div>
      </section>

      {attentionItems.length > 0 ? (
        <section className="mt-16 flex flex-col gap-6">
          <SectionHeading
            eyebrow="Needs your attention"
            title={
              attentionTotalPreview === 1
                ? '1 response is waiting on you'
                : `${attentionTotalPreview} responses are waiting on you`
            }
            description="Submissions where at least one short-answer question is still pending, awaiting manual review, or graded by the legacy fallback."
            actions={
              <Button asChild variant="ghost" size="sm">
                <a href={withBasePath('/dashboard/professor/attention')}>
                  Open queue
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            }
          />
          <ul className="paper paper-shadow divide-y divide-rule">
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
                  <div className="flex items-center gap-2">
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
        </section>
      ) : null}

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <SectionHeading
            eyebrow="Recent submissions"
            title="What just came in"
            actions={
              <Button asChild variant="ghost" size="sm">
                <a href={withBasePath('/dashboard/professor/quiz-results')}>
                  See all
                </a>
              </Button>
            }
          />
          {recentAttempts.length > 0 ? (
            <ul className="paper paper-shadow divide-y divide-rule">
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
                      {attempt.quiz.title} ·{' '}
                      {attempt.section.course.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tnum text-sm text-ink">
                      {attempt.percentage ?? 0}%
                    </span>
                    <Badge
                      variant={attempt.passed ? 'success' : 'destructive'}
                    >
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Nothing submitted yet."
              description="When learners begin completing your quizzes, their work will show up here in real time."
            />
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <SectionHeading
            eyebrow="Export"
            title="Take it with you"
            description="Download attempt data as CSV for your gradebook."
          />
          <div className="paper paper-shadow p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-ink-muted">
              <Download className="h-4 w-4" />
              <span className="text-sm">Export quiz results</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Pick a quiz, download the CSV. Includes per-question scores,
              timestamps, and AI-grader reasoning.
            </p>
            <ExportResultsWrapper quizzes={professorQuizzes} />
          </div>
        </div>
      </section>

      <section className="mt-16 flex flex-col gap-6">
        <SectionHeading
          eyebrow="Your quizzes"
          title="Five most recent"
          actions={
            <Button asChild variant="ghost" size="sm">
              <a href={withBasePath('/dashboard/professor/quizzes')}>
                Open library
              </a>
            </Button>
          }
        />
        {professorQuizzes.length > 0 ? (
          <ul className="paper paper-shadow divide-y divide-rule">
            {professorQuizzes.slice(0, 5).map((quiz) => (
              <li
                key={quiz.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink truncate">
                    {quiz.title}
                  </div>
                  <div className="text-xs text-ink-muted truncate mt-0.5">
                    {quiz.sectionAssignments[0]?.section.course.title ||
                      'No course'}{' '}
                    · {quiz.attempts.length} attempts
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={withBasePath(
                      `/dashboard/professor/quiz/${quiz.id}/results`,
                    )}
                  >
                    Results
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No quizzes yet."
            description="Compose your first quiz to begin assigning work to your sections. Every quiz versions as you edit."
            actions={
              <Button asChild size="lg">
                <a href={withBasePath('/dashboard/professor/quiz/new')}>
                  <Plus className="h-4 w-4" />
                  Compose your first quiz
                </a>
              </Button>
            }
          />
        )}
      </section>
    </AppShell>
  );
}
