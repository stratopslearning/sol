import { notFound } from 'next/navigation';

import { CourseAssignmentsClient } from '@/app/dashboard/professor/assignments/[courseId]/CourseAssignmentsClient';
import { ProfessorToolCourseShell } from '@/components/professor/ProfessorToolCourseShell';
import { listCourseActivities } from '@/lib/assignments';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import { appPath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { fetchSectionsByIds } from '@/lib/db/entityScopedReads';
import {
  assertCanManageCourse,
  listTeachableCourses,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

export default async function ProfessorAssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  let course: { id: string; title: string };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  const [activities, teachable, teachableSectionIds] = await Promise.all([
    listCourseActivities({ courseId }),
    listTeachableCourses(user),
    listTeachableSectionIdsForCourse(user, courseId),
  ]);
  const sectionRows = teachableSectionIds.length
    ? await fetchSectionsByIds(teachableSectionIds)
    : [];
  const sectionOptions = sectionRows.map((s) => ({
    id: s.id,
    title: s.name,
  }));

  return (
    <ProfessorToolCourseShell
      active="assignments"
      toolLabel="Assignments"
      toolHref="/dashboard/professor/assignments"
      courseId={courseId}
      courseTitle={course.title}
      description="Quizzes, discussions, and interactives for this course."
      teachable={teachable}
      hrefTemplate="/dashboard/professor/assignments/{courseId}"
    >
      <CourseAssignmentsClient
        activities={activities}
        sectionOptions={sectionOptions}
        createQuizHref={appPath(
          `/dashboard/professor/quiz/new?courseId=${courseId}`,
        )}
        importQuizHref={appPath(
          `/dashboard/professor/quiz/new?courseId=${courseId}&import=csv`,
        )}
        createDiscussionHref={appPath(
          `/dashboard/professor/discussions/new?courseId=${courseId}`,
        )}
        createInteractiveHref={appPath(
          `/dashboard/professor/interactive/new?courseId=${courseId}`,
        )}
        authoringHref={appPath(`/dashboard/professor/authoring/${courseId}`)}
      />
    </ProfessorToolCourseShell>
  );
}