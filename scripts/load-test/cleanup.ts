/**
 * Delete load-test rows (clerk_id loadtest_* / @loadtest.local) from the
 * isolated Neon branch. Never runs against Vercel production.
 *
 *   LOAD_TEST_DATABASE_URL=postgres://... npx tsx scripts/load-test/cleanup.ts
 *   LOAD_TEST_DATABASE_URL=postgres://... npx tsx scripts/load-test/cleanup.ts --attempts-only
 */
import { inArray, like, or } from 'drizzle-orm';

import {
  assignments,
  attempts,
  courses,
  professorSections,
  questions,
  quizSections,
  quizzes,
  sections,
  studentSections,
  users,
} from '../../app/db/schema';
import {
  LOADTEST_CLERK_PREFIX,
  LOADTEST_EMAIL_DOMAIN,
  assertLoadTestDbAllowed,
  createLoadTestDb,
} from './db';

export async function wipeLoadTestData(
  db: ReturnType<typeof createLoadTestDb>['db'],
  options: { attemptsOnly?: boolean } = {},
) {
  const loadTestUsers = await db.query.users.findMany({
    where: or(
      like(users.clerkId, `${LOADTEST_CLERK_PREFIX}%`),
      like(users.email, `%${LOADTEST_EMAIL_DOMAIN}`),
    ),
  });
  const userIds = loadTestUsers.map((u) => u.id);
  if (userIds.length === 0) {
    console.log('No load-test users found.');
    return { userIds: [] as string[], quizIds: [] as string[] };
  }

  const quizRows = await db.query.quizzes.findMany({
    where: inArray(quizzes.professorId, userIds),
  });
  const quizIds = quizRows.map((q) => q.id);

  if (quizIds.length > 0) {
    await db.delete(attempts).where(inArray(attempts.quizId, quizIds));
  }
  await db.delete(attempts).where(inArray(attempts.studentId, userIds));
  console.log(`Deleted load-test attempts`);
  if (options.attemptsOnly) return { userIds, quizIds };

  if (quizIds.length > 0) {
    await db.delete(assignments).where(inArray(assignments.quizId, quizIds));
    await db.delete(quizSections).where(inArray(quizSections.quizId, quizIds));
    await db.delete(questions).where(inArray(questions.quizId, quizIds));
    await db.delete(quizzes).where(inArray(quizzes.id, quizIds));
  }
  await db.delete(assignments).where(inArray(assignments.studentId, userIds));

  const enrollments = await db.query.professorSections.findMany({
    where: inArray(professorSections.professorId, userIds),
  });
  const sectionIds = [...new Set(enrollments.map((e) => e.sectionId))];

  if (sectionIds.length > 0) {
    await db.delete(studentSections).where(inArray(studentSections.sectionId, sectionIds));
    await db.delete(professorSections).where(inArray(professorSections.sectionId, sectionIds));
    await db.delete(quizSections).where(inArray(quizSections.sectionId, sectionIds));
    await db.delete(attempts).where(inArray(attempts.sectionId, sectionIds));
    await db.delete(sections).where(inArray(sections.id, sectionIds));
  }
  await db.delete(studentSections).where(inArray(studentSections.studentId, userIds));
  await db.delete(professorSections).where(inArray(professorSections.professorId, userIds));

  const courseRows = await db.query.courses.findMany();
  const loadTestCourses = courseRows.filter((c) => c.title.startsWith('Load Test '));
  if (loadTestCourses.length > 0) {
    await db.delete(courses).where(
      inArray(
        courses.id,
        loadTestCourses.map((c) => c.id),
      ),
    );
  }

  await db.delete(users).where(inArray(users.id, userIds));
  console.log(
    `Removed ${userIds.length} users, ${quizIds.length} quizzes, ${sectionIds.length} sections.`,
  );
  return { userIds, quizIds };
}

const isMain = process.argv[1]?.includes('cleanup.ts');
if (isMain) {
  const attemptsOnly = process.argv.includes('--attempts-only');
  const url = assertLoadTestDbAllowed();
  const { pool, db } = createLoadTestDb(url);
  wipeLoadTestData(db, { attemptsOnly })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
