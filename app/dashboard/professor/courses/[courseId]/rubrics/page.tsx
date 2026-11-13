import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreateRubricForm } from '@/components/lms/CreateForms';
import { listCourseRubricsDefiner } from '@/lib/db/lmsDefiners';

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
  const rubrics = await listCourseRubricsDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('rubrics', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Rubrics"
    >
      <CreateRubricForm courseId={courseId} />
      <ul className="mt-6 space-y-2">
        {rubrics.map((r) => (
          <li key={String(r.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(r.title)}
          </li>
        ))}
      </ul>
    </CourseHubShell>
  );
}
