import { notFound } from 'next/navigation';

import ExportResultsWrapper from '@/components/ExportResultsWrapper';
import { SectionGradebookTable } from '@/components/sections/SectionGradebookTable';
import type { GradebookLearnerRow } from '@/components/sections/SectionGradebookTable';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { logGradebookAccess } from '@/lib/audit';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { withBasePath } from '@/lib/basePath';
import { comparePersonsByLastName } from '@/lib/personName';
import { fetchAttemptScoreRowsForSections } from '@/lib/db/facultyStudentReads';
import { fetchSectionById } from '@/lib/db/entityScopedReads';
import { assertTeachesSection } from '@/lib/professor/sections';
import { loadSectionDetailData } from '@/lib/sectionDetailData';

export default async function SectionGradebookPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  const me = await requireTeachingAccess();
  try {
    await assertTeachesSection(me, sectionId);
  } catch {
    return notFound();
  }

  // FORCE RLS: bare drizzle section reads return empty without a tenant GUC.
  const [detail, sectionMeta] = await Promise.all([
    loadSectionDetailData(sectionId),
    fetchSectionById(sectionId),
  ]);
  if (!detail || !sectionMeta || sectionMeta.deletedAt) return notFound();

  const tenantId = sectionMeta.tenantId ?? sectionMeta.workspaceId;
  await logGradebookAccess({
    actorUserId: me.id,
    actorClerkId: me.clerkId,
    sectionId,
    role: me.platformStaff ? 'ADMIN' : 'PROFESSOR',
    tenantId: tenantId ?? null,
  });

  const students = detail.learnerEnrollments
    .filter((e) => e.status === 'ACTIVE')
    .map((e) => e.person)
    .sort((a, b) => comparePersonsByLastName(a, b));

  const sectionQuizzes = detail.quizzes;
  const quizIds = sectionQuizzes.map((q) => q.id);

  const scoreRows = await fetchAttemptScoreRowsForSections([sectionId]);
  const studentQuizScores: Record<
    string,
    Record<
      string,
      { score: number; percentage: number; maxScore: number; attemptId?: string }
    >
  > = {};
  for (const row of scoreRows) {
    if (!quizIds.includes(row.quizId)) continue;
    const pct = row.percentage ?? 0;
    const score = row.score ?? 0;
    if (!studentQuizScores[row.studentId]) studentQuizScores[row.studentId] = {};
    const existing = studentQuizScores[row.studentId][row.quizId];
    if (
      !existing ||
      pct > existing.percentage ||
      (pct === existing.percentage && score > existing.score)
    ) {
      studentQuizScores[row.studentId][row.quizId] = {
        score,
        percentage: pct,
        maxScore: row.maxScore ?? 0,
      };
    }
  }

  // Non-quiz completion columns still need a DEFINER helper (FORCE RLS).
  const completionColumns: Array<{
    id: string;
    title: string;
    type: 'LESSON' | 'DISCUSSION' | 'INTERACTIVE';
  }> = [];

  const learners: GradebookLearnerRow[] = students.map((student) => {
    const bestPercentages = sectionQuizzes
      .map((quiz) => studentQuizScores[student.id]?.[quiz.id]?.percentage)
      .filter((p): p is number => p != null);
    const average =
      bestPercentages.length > 0
        ? Math.round(
            bestPercentages.reduce((sum, p) => sum + p, 0) /
              bestPercentages.length,
          )
        : null;

    const cells: GradebookLearnerRow['cells'] = {};
    for (const quiz of sectionQuizzes) {
      const cell = studentQuizScores[student.id]?.[quiz.id];
      if (cell) cells[quiz.id] = cell;
    }

    return {
      id: student.id,
      person: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
      cells,
      completions: {},
      average,
    };
  });

  const section = detail.section;

  return (
    <AppShell
      role="professor"
      active="courses"
      topbarTitle="Gradebook"
      maxWidth="wide"
    >
      <PageHeader
        breadcrumbs={[
          {
            label: 'Courses',
            href: withBasePath('/dashboard/professor/courses'),
          },
          ...(section.course
            ? [
                {
                  label: section.course.title,
                  href: withBasePath(
                    `/dashboard/professor/courses/${section.course.id}/sections`,
                  ),
                },
              ]
            : []),
          {
            label: section.name,
            href: withBasePath(`/dashboard/professor/sections/${section.id}`),
          },
          { label: 'Gradebook' },
        ]}
        eyebrow="Gradebook"
        title={`${section.name} grades`}
        description={
          section.course
            ? `${section.course.title} · ${students.length} learners · ${sectionQuizzes.length} quizzes · ${completionColumns.length} completion activities`
            : `${students.length} learners · ${sectionQuizzes.length} quizzes · ${completionColumns.length} completion activities`
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
          {students.length === 0 ||
          (sectionQuizzes.length === 0 && completionColumns.length === 0) ? (
            <EmptyState
              eyebrow="Empty"
              title={
                students.length === 0
                  ? 'No learners enrolled.'
                  : 'No assignments in this section yet.'
              }
              description={
                students.length === 0
                  ? 'Share the learner enrolment code on the section detail page.'
                  : 'Assign a quiz, lesson, discussion, or interactive to start the gradebook.'
              }
            />
          ) : (
            <SectionGradebookTable
              learners={learners}
              quizzes={sectionQuizzes.map((q) => ({ id: q.id, title: q.title }))}
              completionColumns={completionColumns.map((c) => ({
                id: c.id,
                title: c.title,
                type: c.type,
              }))}
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}
