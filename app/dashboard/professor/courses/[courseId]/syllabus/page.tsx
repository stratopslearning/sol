import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { LmsToolPlaceholder } from '@/components/lms/LmsToolPlaceholder';
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
  const syllabus = lms.syllabusMarkdown;
  void user;
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('syllabus', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Syllabus"
    >
      {syllabus ? (
        <pre className="whitespace-pre-wrap rounded border border-rule/60 bg-surface p-4 text-sm">
          {syllabus}
        </pre>
      ) : (
        <LmsToolPlaceholder
          title="Syllabus"
          description="Add syllabus content in Settings."
        />
      )}
      <a
        className="mt-4 inline-block text-sm text-brand hover:underline"
        href={withBasePath(`/dashboard/professor/courses/${courseId}/settings`)}
      >
        Edit in Settings
      </a>
    </CourseHubShell>
  );
}
