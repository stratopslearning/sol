import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { flashcards } from '@/app/db/schema';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';

export async function listFlashcardsForStudent(
  studentId: string,
  lessonId: string,
) {
  await assertStudentCanAccessLesson(studentId, lessonId);
  const rows = await db.query.flashcards.findMany({
    where: and(eq(flashcards.lessonId, lessonId), isNull(flashcards.deletedAt)),
    orderBy: [asc(flashcards.position)],
  });
  return rows.map((r) => ({
    id: r.id,
    front: r.front,
    back: r.back,
    position: r.position,
  }));
}
