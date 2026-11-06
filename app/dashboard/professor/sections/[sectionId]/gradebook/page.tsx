import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { appRedirect } from '@/lib/serverRedirect';

import { db } from '@/app/db';
import {
  professorSections,
  quizSections,
  sections,
  studentSections,
} from '@/app/db/schema';
import ExportResultsWrapper from '@/components/ExportResultsWrapper';
import { SectionGradebookTable } from '@/components/sections/SectionGradebookTable';
import type { GradebookLearnerRow } from '@/components/sections/SectionGradebookTable';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { logGradebookAccess } from '@/lib/audit';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { authorizeOnSection } from '@/lib/authz/courseAccess';
import { withBasePath } from '@/lib/basePath';
import { activeOnly } from '@/lib/db/filters';
import { comparePersonsByLastName } from '@/lib/personName';
import {
  buildCompletionMapForSection,
  listSectionCompletionColumns,
} from '@/lib/assignments/completion';
import { buildGradebookScoresForSection } from '@/lib/professorVisibleAttempts';

export default async function SectionGradebookPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  const me = await requireTeachingAccess();

  await logGradebookAccess({
    actorUserId: me.id,
    actorClerkId: me.clerkId,
    sectionId,
    role: me.platformStaff ? 'ADMIN' : 'PROFESSOR',
  });

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    with: { course: true },
  });
  if (!section) return notFound();

  // Binding-based (grade.write / content.read on the section); professor_sections is metadata.
  if (
    !(await authorizeOnSection(me, 'grade.write', sectionId)) &&
    !(await authorizeOnSection(me, 'content.read', sectionId))
  ) {
    return notFound();
  }

  const studentEnrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.sectionId, sectionId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { student: true },
  });
  const students = studentEnrollments
    .map((e) => e.student)
    .sort((a, b) => comparePersonsByLastName(a, b));

  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizSectionAssignments
    .map((qs) => qs.quiz)
    .filter((q): q is NonNullable<(typeof quizSectionAssignments)[0]['quiz']> =>
      q != null && q.deletedAt == null,
    );
  const quizIds = sectionQuizzes.map((q) => q.id);

  const studentQuizScores = await buildGradebookScoresForSection({
    sectionId,
    quizIds,
    enrolledStudentIds: students.map((s) => s.id),
  });

  const completionColumns = await listSectionCompletionColumns(sectionId);
  const completionMap = await buildCompletionMapForSection({
    sectionId,
    columns: completionColumns,
    studentIds: students.map((s) => s.id),
  });

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
      completions: completionMap[student.id] ?? {},
      average,
    };
  });

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
            href: withBasePath(
              `/dashboard/professor/sections/${section.id}`,
            ),
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
