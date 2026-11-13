import { ApiError } from '@/lib/api/errors';
import {
  fetchLessonSectionIdsDefiner,
  upsertLessonProgressDefiner,
} from '@/lib/db/studentReadDefiners';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';

export async function upsertLessonProgress(
  studentId: string,
  lessonId: string,
  status: 'STARTED' | 'COMPLETED',
) {
  await assertStudentCanAccessLesson(studentId, lessonId);

  let row: { status: string; completedAt: Date | null };
  try {
    row = await upsertLessonProgressDefiner({
      lessonId,
      studentId,
      status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('already completed')) {
      throw ApiError.badRequest('Lesson is already completed');
    }
    throw err;
  }

  if (status === 'COMPLETED') {
    void enqueueLessonCompletionPassback(studentId, lessonId);
  }

  return {
    status: row.status as 'STARTED' | 'COMPLETED',
    completedAt: row.completedAt,
  };
}

async function enqueueLessonCompletionPassback(
  studentId: string,
  lessonId: string,
) {
  try {
    const { enqueueCompletionPassback } = await import('@/lib/lti/passback');
    const links = await fetchLessonSectionIdsDefiner(lessonId);
    for (const sectionId of links) {
      void enqueueCompletionPassback({
        ref: { lessonId },
        studentId,
        sectionId,
        completed: true,
      });
    }
  } catch (err) {
    console.error('LTI lesson completion passback failed', err);
  }
}
