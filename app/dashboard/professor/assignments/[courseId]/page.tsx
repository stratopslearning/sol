import { notFound } from 'next/navigation';

import { CourseAssignmentsClient } from '@/app/dashboard/professor/assignments/[courseId]/CourseAssignmentsClient';
import { ProfessorToolCourseShell } from '@/components/professor/ProfessorToolCourseShell';
import { listCourseActivities } from '@/lib/assignments';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import { appPath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { fetchSectionsByIds } from '@/lib/db/entityScopedReads';
import { TeachingPaywallBanner } from '@/components/workspace/TeachingPaywallBanner';
import {
  assertCanManageCourse,
  listTeachableCourses,
} from '@/lib/knowledge';
import { assertWorkspaceAllowsTeaching } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function ProfessorAssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  let course: { id: string; title: string; workspaceId: string | null };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  const teachingEntitlement = course.workspaceId
    ? await assertWorkspaceAllowsTeaching(course.workspaceId)
    : { ok: true as const };
  const teachingBlocked =
    !teachingEntitlement.ok &&
    teachingEntitlement.code === 'billing_required';

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
      {course.workspaceId && teachingBlocked ? (
        <div className="mb-6">
          <TeachingPaywallBanner
            workspaceId={course.workspaceId}
            reason={teachingEntitlement.reason}
          />
        </div>
      ) : null}
      <CourseAssignmentsClient
        activities={activities}
        sectionOptions={sectionOptions}
        createQuizHref={
          teachingBlocked
            ? undefined
            : appPath(`/dashboard/professor/quiz/new?courseId=${courseId}`)
        }
        importQuizHref={
          teachingBlocked
            ? undefined
            : appPath(
                `/dashboard/professor/quiz/new?courseId=${courseId}&import=csv`,
              )
        }
        createDiscussionHref={
          teachingBlocked
            ? undefined
            : appPath(
                `/dashboard/professor/discussions/new?courseId=${courseId}`,
              )
        }
        createInteractiveHref={
          teachingBlocked
            ? undefined
            : appPath(
                `/dashboard/professor/interactive/new?courseId=${courseId}`,
              )
        }
        authoringHref={appPath(`/dashboard/professor/authoring/${courseId}`)}
      />
    </ProfessorToolCourseShell>
  );
}