import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { withBasePath } from '@/lib/basePath';
import { listCourseMaterials } from '@/lib/knowledge';

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
  const materials = await listCourseMaterials(user, courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('files', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Files"
    >
      <div className="space-y-4">
        <ul className="space-y-1">
          {materials.map((m) => (
            <li key={m.id} className="text-sm">
              {m.title}{' '}
              <span className="text-ink-muted">· {m.status}</span>
            </li>
          ))}
          {materials.length === 0 ? (
            <li className="text-sm text-ink-muted">No materials yet.</li>
          ) : null}
        </ul>
        <a
          className="text-sm text-brand hover:underline"
          href={withBasePath(`/dashboard/professor/materials/${courseId}`)}
        >
          Manage materials
        </a>
      </div>
    </CourseHubShell>
  );
}
