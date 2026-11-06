import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { assignments, quizSections, studentSections } from '@/app/db/schema';
import { withBasePath } from '@/lib/basePath';
import { isQuizListedForStudents } from '@/lib/quizAvailability';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';
import { normalizeDatabaseDate } from '@/lib/utils';

export type StudentCalendarEvent = {
  id: string;
  quizId: string;
  title: string;
  sectionId: string;
  sectionName: string;
  courseTitle: string;
  /** ISO due instant (quiz endDate, else per-student assignment dueDate). */
  dueAt: string;
  href: string;
};

/**
 * Quizzes due for the student’s active sections.
 * Due = quiz.endDate ?? assignment.dueDate (matches take-window rules).
 */
export async function listStudentQuizDueEvents(
  studentId: string,
): Promise<StudentCalendarEvent[]> {
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: { with: { course: true } } },
  });
  const { active } = partitionEnrollmentsByConclusion(enrollments);
  const sectionIds = active.map((e) => e.sectionId);
  if (sectionIds.length === 0) return [];

  const sectionMeta = new Map(
    active.map((e) => [
      e.sectionId,
      {
        name: e.section.name,
        courseTitle: e.section.course?.title ?? 'Course',
      },
    ]),
  );

  const links = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, sectionIds),
    with: { quiz: true, section: { with: { course: true } } },
  });

  const quizIds = [
    ...new Set(
      links
        .filter((l) => l.quiz && isQuizListedForStudents(l.quiz))
        .map((l) => l.quizId),
    ),
  ];
  if (quizIds.length === 0) return [];

  const studentAssignments = await db.query.assignments.findMany({
    where: and(
      eq(assignments.studentId, studentId),
      inArray(assignments.quizId, quizIds),
    ),
    columns: { quizId: true, dueDate: true },
  });
  const dueByQuiz = new Map(
    studentAssignments.map((a) => [a.quizId, a.dueDate]),
  );

  const events: StudentCalendarEvent[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const quiz = link.quiz;
    if (!quiz || !isQuizListedForStudents(quiz)) continue;

    const endDate = normalizeDatabaseDate(quiz.endDate);
    const assignDue = normalizeDatabaseDate(dueByQuiz.get(quiz.id) ?? null);
    const due = endDate ?? assignDue;
    if (!due) continue;

    const key = `${quiz.id}:${link.sectionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const meta = sectionMeta.get(link.sectionId) ?? {
      name: link.section?.name ?? 'Section',
      courseTitle: link.section?.course?.title ?? 'Course',
    };

    events.push({
      id: key,
      quizId: quiz.id,
      title: quiz.title,
      sectionId: link.sectionId,
      sectionName: meta.name,
      courseTitle: meta.courseTitle,
      dueAt: due.toISOString(),
      href: withBasePath(`/quiz/${quiz.id}`),
    });
  }

  return events.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
}
