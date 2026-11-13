import { CourseSettingsNavClient } from '@/components/lms/CourseSettingsNavClient';
import { CourseHubShell } from '@/components/professor/CourseHubShell';
import { CourseTutorPolicyCard } from '@/components/professor/CourseTutorPolicyCard';
import { withBasePath } from '@/lib/basePath';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { courseId } = await params;
  const studentView = (await searchParams).as === 'student';
  const { course, lms } = await requireFacultyCourse(courseId);

  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('settings', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Navigation, syllabus, and course defaults."
    >
      <div className="space-y-10">
        <CourseSettingsNavClient
          courseId={courseId}
          initialNav={lms.nav}
          syllabusMarkdown={lms.syllabusMarkdown}
        />
        <CourseTutorPolicyCard courseId={courseId} initialMode={null} />
        <div>
          <h2 className="mb-2 text-base font-medium text-ink">AI authoring</h2>
          <a
            className="text-sm text-brand hover:underline"
            href={withBasePath(`/dashboard/professor/authoring/${courseId}`)}
          >
            Open Authoring for this course
          </a>
        </div>
      </div>
    </CourseHubShell>
  );
}
