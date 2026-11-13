import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreateDiscussionForm } from '@/components/lms/CreateForms';
import { listPeerDiscussionsDefiner } from '@/lib/db/lmsDefiners';

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
  const discussions = await listPeerDiscussionsDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('discussions', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Discussions"
    >
      <CreateDiscussionForm courseId={courseId} />
      <ul className="mt-6 space-y-2">
        {discussions.map((d) => (
          <li key={String(d.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(d.title)}
            <span className="ml-2 text-xs text-ink-muted">
              {d.published ? 'Published' : 'Draft'}
            </span>
          </li>
        ))}
      </ul>
    </CourseHubShell>
  );
}
