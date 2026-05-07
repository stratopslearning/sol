/**
 * Lightweight factories for building seed data in integration tests.
 * Idempotent within a single test run — each helper inserts a fresh row
 * with a unique-by-default identifier and returns the inserted record.
 */
import {
  assignments,
  attempts,
  courses,
  questions,
  quizSections,
  quizzes,
  sections,
  studentSections,
  users,
} from '@/app/db/schema';

import type { TestDb } from './db';

const randomSlug = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export async function makeUser(
  db: TestDb,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [row] = await db
    .insert(users)
    .values({
      clerkId: `test_${randomSlug()}`,
      email: `${randomSlug()}@test.local`,
      role: 'STUDENT',
      paid: true,
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeCourse(
  db: TestDb,
  overrides: Partial<typeof courses.$inferInsert> = {},
) {
  const [row] = await db
    .insert(courses)
    .values({
      title: `Course ${randomSlug()}`,
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeSection(
  db: TestDb,
  courseId: string,
  overrides: Partial<typeof sections.$inferInsert> = {},
) {
  const [row] = await db
    .insert(sections)
    .values({
      courseId,
      name: `Section ${randomSlug()}`,
      professorEnrollmentCode: randomSlug(),
      studentEnrollmentCode: randomSlug(),
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeQuiz(
  db: TestDb,
  professorId: string,
  overrides: Partial<typeof quizzes.$inferInsert> = {},
) {
  const [row] = await db
    .insert(quizzes)
    .values({
      title: `Quiz ${randomSlug()}`,
      professorId,
      maxAttempts: 1,
      passingScore: 60,
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeQuestion(
  db: TestDb,
  quizId: string,
  overrides: Partial<typeof questions.$inferInsert> = {},
) {
  const [row] = await db
    .insert(questions)
    .values({
      quizId,
      type: 'MULTIPLE_CHOICE',
      question: 'A?',
      options: ['a', 'b'],
      correctAnswer: 'a',
      points: 1,
      order: 0,
      ...overrides,
    })
    .returning();
  return row;
}

export async function enrollStudent(
  db: TestDb,
  studentId: string,
  sectionId: string,
) {
  await db
    .insert(studentSections)
    .values({ studentId, sectionId })
    .onConflictDoNothing();
}

export async function assignQuizToSection(
  db: TestDb,
  quizId: string,
  sectionId: string,
  assignedBy: string,
) {
  await db
    .insert(quizSections)
    .values({ quizId, sectionId, assignedBy })
    .onConflictDoNothing();
}

export async function makeAssignment(
  db: TestDb,
  quizId: string,
  studentId: string,
  overrides: Partial<typeof assignments.$inferInsert> = {},
) {
  const [row] = await db
    .insert(assignments)
    .values({
      quizId,
      studentId,
      ...overrides,
    })
    .onConflictDoNothing()
    .returning();
  return row;
}

export async function makeAttempt(
  db: TestDb,
  data: {
    assignmentId: string;
    studentId: string;
    quizId: string;
    sectionId: string;
    submittedAt?: Date;
    startedAt?: Date;
    answers?: Record<string, string>;
  },
) {
  const [row] = await db
    .insert(attempts)
    .values({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      quizId: data.quizId,
      sectionId: data.sectionId,
      answers: data.answers ?? {},
      maxScore: 1,
      startedAt: data.startedAt ?? new Date(),
      submittedAt: data.submittedAt ?? null,
    })
    .returning();
  return row;
}
