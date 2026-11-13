import { notFound } from 'next/navigation';

import { InteractiveChapterPlayer } from '@/components/lms/InteractiveChapterPlayer';
import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { fetchLessonByIdDefiner } from '@/lib/db/studentReadDefiners';
import { isInteractiveChapterBody } from '@/lib/lms/interactiveChapter';
import { withBasePath } from '@/lib/basePath';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export default async function FacultyLessonPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { courseId, lessonId } = await params;
  const studentView = (await searchParams).as === 'student';
  const { course, lms } = await requireFacultyCourse(courseId);
  const lesson = await fetchLessonByIdDefiner(lessonId);
  if (!lesson || lesson.courseId !== courseId) notFound();

  const chapter = isInteractiveChapterBody(lesson.chapter)
    ? lesson.chapter
    : null;

  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('modules', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description={
        chapter
          ? studentView
            ? 'Student preview of this interactive chapter.'
            : 'Interactive chapter preview.'
          : 'Lesson preview.'
      }
    >
      {chapter ? (
        <InteractiveChapterPlayer
          lessonId={lesson.id}
          title={lesson.title}
          courseTitle={course.title}
          chapter={chapter}
          initialProgress={[]}
          preview
        />
      ) : (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-ink">{lesson.title}</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lesson.markdown}
            </ReactMarkdown>
          </div>
          <p className="text-sm text-ink-muted">
            <a
              className="text-brand hover:underline"
              href={withBasePath(
                `/dashboard/professor/courses/${courseId}/modules${studentView ? '?as=student' : ''}`,
              )}
            >
              ← Back to modules
            </a>
          </p>
        </div>
      )}
    </CourseHubShell>
  );
}
