import { fetchLessonFlashcardsDefiner } from '@/lib/db/studentReadDefiners';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';

export async function listFlashcardsForStudent(
  studentId: string,
  lessonId: string,
) {
  await assertStudentCanAccessLesson(studentId, lessonId);
  const rows = await fetchLessonFlashcardsDefiner(lessonId);
  return rows.map((r) => ({
    id: r.id,
    front: r.front,
    back: r.back,
    position: r.position,
  }));
}
