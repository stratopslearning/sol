import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { lessonProgress } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';

export async function upsertLessonProgress(
  studentId: string,
  lessonId: string,
  status: 'STARTED' | 'COMPLETED',
) {
  await assertStudentCanAccessLesson(studentId, lessonId);

  const existing = await db.query.lessonProgress.findFirst({
    where: and(
      eq(lessonProgress.lessonId, lessonId),
      eq(lessonProgress.studentId, studentId),
    ),
  });

  const now = new Date();
  if (!existing) {
    const [row] = await db
      .insert(lessonProgress)
      .values({
        lessonId,
        studentId,
        status,
        completedAt: status === 'COMPLETED' ? now : null,
      })
      .returning();
    if (status === 'COMPLETED') {
      void enqueueLessonCompletionPassback(studentId, lessonId);
    }
    return {
      status: row.status as 'STARTED' | 'COMPLETED',
      completedAt: row.completedAt,
    };
  }

  if (existing.status === 'COMPLETED' && status === 'STARTED') {
    throw ApiError.badRequest('Lesson is already completed');
  }

  const [row] = await db
    .update(lessonProgress)
    .set({
      status,
      completedAt: status === 'COMPLETED' ? now : existing.completedAt,
      updatedAt: now,
    })
    .where(eq(lessonProgress.id, existing.id))
    .returning();

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
    const { lessonSections } = await import('@/app/db/schema');
    const { db } = await import('@/app/db');
    const { eq } = await import('drizzle-orm');
    const links = await db.query.lessonSections.findMany({
      where: eq(lessonSections.lessonId, lessonId),
    });
    for (const link of links) {
      void enqueueCompletionPassback({
        ref: { lessonId },
        studentId,
        sectionId: link.sectionId,
        completed: true,
      });
    }
  } catch (err) {
    console.error('LTI lesson completion passback failed', err);
  }
}
