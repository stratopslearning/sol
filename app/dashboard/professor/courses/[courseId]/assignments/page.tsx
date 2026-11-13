import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreateAssignmentGroupForm } from '@/components/lms/CreateForms';
import { listAssignmentGroupsDefiner } from '@/lib/db/lmsDefiners';
import { withBasePath } from '@/lib/basePath';

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
  const groups = await listAssignmentGroupsDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('assignments', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Assignments"
    >
      <CreateAssignmentGroupForm courseId={courseId} />
      <ul className="mt-6 space-y-2">
        {groups.map((g) => (
          <li key={String(g.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(g.name)} — weight {String(g.weight)}%
            {Number(g.dropLowest) > 0 ? ` · drop lowest ${g.dropLowest}` : ''}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-muted">
        Also manage live activities in{' '}
        <a className="text-brand hover:underline" href={withBasePath(`/dashboard/professor/assignments/${courseId}`)}>
          Assignments registry
        </a>
        .
      </p>
    </CourseHubShell>
  );
}
