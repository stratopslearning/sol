import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreateAnnouncementForm } from '@/components/lms/CreateForms';
import { listCourseAnnouncementsDefiner } from '@/lib/db/lmsDefiners';

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
  const announcements = await listCourseAnnouncementsDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('announcements', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Announcements"
    >
      <CreateAnnouncementForm courseId={courseId} />
      <ul className="mt-6 space-y-3">
        {announcements.length === 0 ? (
          <li className="text-sm text-ink-muted">No announcements yet.</li>
        ) : (
          announcements.map((a) => (
            <li key={String(a.id)} className="rounded border border-rule/60 p-3">
              <div className="font-medium">{String(a.title)}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                {String(a.bodyMarkdown ?? '')}
              </p>
            </li>
          ))
        )}
      </ul>
    </CourseHubShell>
  );
}
