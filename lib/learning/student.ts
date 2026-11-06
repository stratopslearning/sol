import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  flashcards,
  lessonProgress,
  lessonSections,
  lessons,
  studentSections,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';

export type StudentLessonListItem = {
  id: string;
  title: string;
  courseTitle: string;
  sectionNames: string[];
  flashcardCount: number;
  progressStatus: 'open' | 'STARTED' | 'COMPLETED';
};

export async function listStudentLessons(
  studentId: string,
): Promise<StudentLessonListItem[]> {
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: { with: { course: true } } },
  });
  const { active: activeEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);
  const sectionIds = activeEnrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) return [];

  const assignments = await db.query.lessonSections.findMany({
    where: inArray(lessonSections.sectionId, sectionIds),
    with: {
      lesson: {
        with: {
          course: true,
          sectionAssignments: { with: { section: true } },
          flashcards: {
            where: isNull(flashcards.deletedAt),
          },
        },
      },
      section: true,
    },
  });

  const progressRows = await db.query.lessonProgress.findMany({
    where: eq(lessonProgress.studentId, studentId),
  });
  const progressByLesson = new Map(
    progressRows.map((p) => [p.lessonId, p.status]),
  );

  const activeSectionIdSet = new Set(sectionIds);
  const seen = new Set<string>();
  const rows: StudentLessonListItem[] = [];

  for (const a of assignments) {
    const lesson = a.lesson;
    if (!lesson || lesson.deletedAt || !lesson.isActive) continue;
    if (seen.has(lesson.id)) continue;
    seen.add(lesson.id);

    const status = progressByLesson.get(lesson.id);
    rows.push({
      id: lesson.id,
      title: lesson.title,
      courseTitle: lesson.course?.title ?? '',
      sectionNames: (lesson.sectionAssignments ?? [])
        .filter((sa) => activeSectionIdSet.has(sa.sectionId))
        .map((sa) => sa.section?.name)
        .filter((n): n is string => Boolean(n)),
      flashcardCount: (lesson.flashcards ?? []).length,
      progressStatus: status
        ? (status as 'STARTED' | 'COMPLETED')
        : 'open',
    });
  }

  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getStudentLessonDetail(
  studentId: string,
  lessonId: string,
) {
  const lesson = await assertStudentCanAccessLesson(studentId, lessonId);

  const cards = await db.query.flashcards.findMany({
    where: and(eq(flashcards.lessonId, lessonId), isNull(flashcards.deletedAt)),
  });
  cards.sort((a, b) => a.position - b.position);

  const progress = await db.query.lessonProgress.findFirst({
    where: and(
      eq(lessonProgress.lessonId, lessonId),
      eq(lessonProgress.studentId, studentId),
    ),
  });

  const course = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { course: true },
  });

  if (!course) throw ApiError.notFound('Lesson not found');

  return {
    id: lesson.id,
    title: lesson.title,
    markdown: lesson.markdown,
    courseTitle: course.course?.title ?? '',
    flashcards: cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      position: c.position,
    })),
    progress: progress
      ? {
          status: progress.status as 'STARTED' | 'COMPLETED',
          completedAt: progress.completedAt,
        }
      : null,
  };
}
