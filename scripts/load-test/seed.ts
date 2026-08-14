/**
 * Seed 400 load-test students + MCQ/SA quizzes on the Neon *branch*.
 *
 *   LOAD_TEST_DATABASE_URL=postgres://...-pooler... npx tsx scripts/load-test/seed.ts
 *
 * Writes load-test/fixture.json (gitignored) for k6.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generateEnrollmentCode } from '../../lib/utils';
import {
  assignments,
  courses,
  professorSections,
  questions,
  quizSections,
  quizzes,
  sections,
  studentSections,
  users,
} from '../../app/db/schema';
import { wipeLoadTestData } from './cleanup';
import {
  LOADTEST_CLERK_PREFIX,
  LOADTEST_EMAIL_DOMAIN,
  assertLoadTestDbAllowed,
  createLoadTestDb,
} from './db';

const STUDENT_COUNT = Number(process.env.LOAD_TEST_STUDENTS ?? 400);
const FIXTURE_PATH = path.resolve('load-test/fixture.json');

type FixtureStudent = {
  id: string;
  email: string;
  mcqAssignmentId: string;
  saAssignmentId: string;
};

export type LoadTestFixture = {
  professorId: string;
  sectionId: string;
  courseId: string;
  mcqQuizId: string;
  saQuizId: string;
  mcqAnswers: Record<string, string>;
  saAnswers: Record<string, string>;
  students: FixtureStudent[];
};

async function main() {
  if (!Number.isFinite(STUDENT_COUNT) || STUDENT_COUNT < 1 || STUDENT_COUNT > 2000) {
    throw new Error('LOAD_TEST_STUDENTS must be between 1 and 2000');
  }

  const url = assertLoadTestDbAllowed();
  const { pool, db } = createLoadTestDb(url);

  try {
    await wipeLoadTestData(db);

    const [professor] = await db
      .insert(users)
      .values({
        clerkId: `${LOADTEST_CLERK_PREFIX}professor`,
        email: `professor${LOADTEST_EMAIL_DOMAIN}`,
        firstName: 'Load',
        lastName: 'Professor',
        role: 'PROFESSOR',
        paid: true,
      })
      .returning();

    const [course] = await db
      .insert(courses)
      .values({
        title: 'Load Test Course',
        description: 'Synthetic course for k6 exam simulation',
        status: 'ACTIVE',
        isActive: true,
      })
      .returning();

    const [section] = await db
      .insert(sections)
      .values({
        courseId: course.id,
        name: 'Load Test Section A',
        professorEnrollmentCode: generateEnrollmentCode(),
        studentEnrollmentCode: generateEnrollmentCode(),
        isActive: true,
      })
      .returning();

    await db.insert(professorSections).values({
      professorId: professor.id,
      sectionId: section.id,
    });

    const [mcqQuiz] = await db
      .insert(quizzes)
      .values({
        title: 'Load Test MCQ Exam',
        description: 'Multiple-choice only — no OpenAI',
        professorId: professor.id,
        maxAttempts: 10,
        passingScore: 60,
        isActive: true,
      })
      .returning();

    const [saQuiz] = await db
      .insert(quizzes)
      .values({
        title: 'Load Test Short-Answer Exam',
        description: 'Two short answers — OpenAI grading',
        professorId: professor.id,
        maxAttempts: 10,
        passingScore: 60,
        isActive: true,
      })
      .returning();

    await db.insert(quizSections).values([
      { quizId: mcqQuiz.id, sectionId: section.id, assignedBy: professor.id },
      { quizId: saQuiz.id, sectionId: section.id, assignedBy: professor.id },
    ]);

    const mcqDefs = [
      { question: '2 + 2 = ?', options: ['3', '4', '5', '22'], correctAnswer: '4', order: 0 },
      { question: 'Capital of France?', options: ['Berlin', 'Paris', 'Rome', 'Madrid'], correctAnswer: 'Paris', order: 1 },
      { question: 'H2O is?', options: ['Oxygen', 'Hydrogen', 'Water', 'Helium'], correctAnswer: 'Water', order: 2 },
      { question: 'True or false: SOL is an LMS.', options: ['true', 'false'], correctAnswer: 'true', order: 3 },
      { question: 'Which is a mammal?', options: ['Shark', 'Frog', 'Whale', 'Tuna'], correctAnswer: 'Whale', order: 4 },
    ];

    const mcqRows = await db
      .insert(questions)
      .values(
        mcqDefs.map((q) => ({
          quizId: mcqQuiz.id,
          type: 'MULTIPLE_CHOICE' as const,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: 1,
          order: q.order,
        })),
      )
      .returning();

    const saRows = await db
      .insert(questions)
      .values([
        {
          quizId: saQuiz.id,
          type: 'SHORT_ANSWER' as const,
          question: 'What is photosynthesis in one sentence?',
          correctAnswer:
            'Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen.',
          points: 5,
          order: 0,
        },
        {
          quizId: saQuiz.id,
          type: 'SHORT_ANSWER' as const,
          question: 'Why is a primary key unique?',
          correctAnswer:
            'A primary key uniquely identifies each row in a table so records can be referenced without ambiguity.',
          points: 5,
          order: 1,
        },
      ])
      .returning();

    const mcqAnswers: Record<string, string> = {};
    for (const row of mcqRows) {
      mcqAnswers[row.id] = row.correctAnswer ?? '';
    }
    const saAnswers: Record<string, string> = {};
    for (const row of saRows) {
      saAnswers[row.id] = row.correctAnswer ?? 'A reasonable student answer.';
    }

    const studentValues = Array.from({ length: STUDENT_COUNT }, (_, i) => {
      const n = String(i + 1).padStart(4, '0');
      return {
        clerkId: `${LOADTEST_CLERK_PREFIX}student_${n}`,
        email: `student${n}${LOADTEST_EMAIL_DOMAIN}`,
        firstName: 'Load',
        lastName: `Student${n}`,
        role: 'STUDENT' as const,
        paid: true,
      };
    });

    const insertedStudents: (typeof users.$inferSelect)[] = [];
    const BATCH = 100;
    for (let i = 0; i < studentValues.length; i += BATCH) {
      const chunk = await db
        .insert(users)
        .values(studentValues.slice(i, i + BATCH))
        .returning();
      insertedStudents.push(...chunk);
    }

    for (let i = 0; i < insertedStudents.length; i += BATCH) {
      const slice = insertedStudents.slice(i, i + BATCH);
      await db.insert(studentSections).values(
        slice.map((s) => ({ studentId: s.id, sectionId: section.id })),
      );
    }

    const mcqAssignments: { studentId: string; id: string }[] = [];
    const saAssignments: { studentId: string; id: string }[] = [];
    for (let i = 0; i < insertedStudents.length; i += BATCH) {
      const slice = insertedStudents.slice(i, i + BATCH);
      const mcq = await db
        .insert(assignments)
        .values(slice.map((s) => ({ quizId: mcqQuiz.id, studentId: s.id })))
        .returning();
      mcqAssignments.push(...mcq.map((a) => ({ studentId: a.studentId, id: a.id })));
      const sa = await db
        .insert(assignments)
        .values(slice.map((s) => ({ quizId: saQuiz.id, studentId: s.id })))
        .returning();
      saAssignments.push(...sa.map((a) => ({ studentId: a.studentId, id: a.id })));
    }

    const mcqByStudent = new Map(mcqAssignments.map((a) => [a.studentId, a.id]));
    const saByStudent = new Map(saAssignments.map((a) => [a.studentId, a.id]));

    const fixture: LoadTestFixture = {
      professorId: professor.id,
      sectionId: section.id,
      courseId: course.id,
      mcqQuizId: mcqQuiz.id,
      saQuizId: saQuiz.id,
      mcqAnswers,
      saAnswers,
      students: insertedStudents.map((s) => ({
        id: s.id,
        email: s.email,
        mcqAssignmentId: mcqByStudent.get(s.id)!,
        saAssignmentId: saByStudent.get(s.id)!,
      })),
    };

    await mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
    await writeFile(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
    console.log(
      `Seeded ${fixture.students.length} students. Fixture: ${FIXTURE_PATH}`,
    );
    console.log(`MCQ quiz: ${mcqQuiz.id}`);
    console.log(`SA quiz:  ${saQuiz.id}`);
    console.log(`Professor: ${professor.id}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
