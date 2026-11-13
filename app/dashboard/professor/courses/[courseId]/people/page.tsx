import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import { withBasePath } from '@/lib/basePath';
import { fetchCourseHubMeta } from '@/lib/db/entityScopedReads';
import { fetchSectionLearnerCounts } from '@/lib/db/facultyStudentReads';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { courseId } = await params;
  const studentView = (await searchParams).as === 'student';
  const { user, course, lms } = await requireFacultyCourse(courseId);
  const sectionIds = await listTeachableSectionIdsForCourse(user, courseId);
  const hub = await fetchCourseHubMeta(courseId);
  const counts = await fetchSectionLearnerCounts(sectionIds);
  const studentCount = [...counts.values()].reduce((a, b) => a + b, 0);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('people', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="People"
    >
      <div className="space-y-2 text-sm">
        <p>
          {hub?.sectionCount ?? sectionIds.length} sections · {studentCount}{' '}
          learners
        </p>
        <a
          className="text-brand hover:underline"
          href={withBasePath(`/dashboard/professor/courses/${courseId}/sections`)}
        >
          Open sections & roster
        </a>
      </div>
    </CourseHubShell>
  );
}
