import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { listCourseActivities } from '@/lib/assignments';
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
  const activities = (await listCourseActivities({ courseId })).filter(
    (a) => a.type === 'QUIZ',
  );
  void user;
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('quizzes', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Quizzes"
    >
      <ul className="space-y-2">
        {activities.length === 0 ? (
          <li className="text-sm text-ink-muted">No quizzes in this course yet.</li>
        ) : (
          activities.map((a) => (
            <li key={a.id} className="rounded border border-rule/60 px-3 py-2 text-sm">
              <a
                className="text-brand hover:underline"
                href={withBasePath(`/dashboard/professor/quiz/${a.quizId ?? a.id}`)}
              >
                {a.title}
              </a>
            </li>
          ))
        )}
      </ul>
    </CourseHubShell>
  );
}
