import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreatePageForm } from '@/components/lms/CreateForms';
import { listCoursePagesDefiner } from '@/lib/db/lmsDefiners';

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
  const pages = await listCoursePagesDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('pages', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Pages"
    >
      <CreatePageForm courseId={courseId} />
      <ul className="mt-6 space-y-2">
        {pages.map((p) => (
          <li key={String(p.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(p.title)}
            <span className="ml-2 text-xs text-ink-muted">
              {p.published ? 'Published' : 'Draft'} · /{String(p.slug)}
            </span>
          </li>
        ))}
      </ul>
    </CourseHubShell>
  );
}
