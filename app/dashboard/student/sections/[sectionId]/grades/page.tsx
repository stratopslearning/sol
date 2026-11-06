import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';
import { SectionHubShell } from '@/components/student/SectionHubShell';
import { listStudentActivities } from '@/lib/assignments';
import { requireStudent } from '@/lib/auth';
import { isSectionConcluded } from '@/lib/sectionAvailability';
import { requireStudentSectionAccess } from '@/lib/student/sectionAccess';

import StudentCompletionsClient from '@/app/dashboard/student/grades/StudentCompletionsClient';
import StudentGradesTableClient from '@/app/dashboard/student/grades/StudentGradesTableClient';

export default async function StudentSectionGradesPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const user = await requireStudent();
  const { sectionId } = await params;
  const ctx = await requireStudentSectionAccess(user.id, sectionId);

  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    orderBy: (attemptsTable, { desc }) => desc(attemptsTable.submittedAt),
    with: {
      quiz: true,
      section: { with: { course: true } },
    },
  });

  const attemptRows = allAttempts
    .filter((a) => a.sectionId === sectionId)
    .map((a) => ({
      id: a.id,
      quizId: a.quizId,
      sectionId: a.sectionId,
      sectionName: a.section?.name ?? 'Section',
      quizTitle: a.quiz?.title ?? 'Quiz',
      courseTitle: a.section?.course?.title ?? null,
      submittedAt: a.submittedAt
        ? new Date(a.submittedAt).toISOString()
        : null,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      passed: a.passed,
      sectionArchived: isSectionConcluded(a.section),
    }));

  const activities = await listStudentActivities({
    studentId: user.id,
    sectionIds: [sectionId],
  });
  const completionRows = activities
    .filter((a) => a.type !== 'QUIZ')
    .map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      courseTitle: a.courseTitle,
      status: a.completionStatus ?? 'NOT_STARTED',
      href: a.href,
    }));

  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      description="Quiz scores and completion for work in this section."
      activeTab="grades"
      user={user}
    >
      <div className="space-y-12">
        <StudentGradesTableClient
          attempts={attemptRows}
          initialSectionId={sectionId}
        />
        <StudentCompletionsClient rows={completionRows} />
      </div>
    </SectionHubShell>
  );
}