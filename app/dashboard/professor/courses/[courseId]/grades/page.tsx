import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import { withBasePath } from '@/lib/basePath';
import { fetchSectionsByIds } from '@/lib/db/entityScopedReads';

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
  const sections = sectionIds.length
    ? await fetchSectionsByIds(sectionIds)
    : [];
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('grades', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Grades"
    >
      <ul className="space-y-2">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              className="text-sm text-brand hover:underline"
              href={withBasePath(
                `/dashboard/professor/sections/${s.id}/gradebook`,
              )}
            >
              {s.name} gradebook
            </a>
          </li>
        ))}
        {sections.length === 0 ? (
          <li className="text-sm text-ink-muted">No teachable sections yet.</li>
        ) : null}
      </ul>
    </CourseHubShell>
  );
}
