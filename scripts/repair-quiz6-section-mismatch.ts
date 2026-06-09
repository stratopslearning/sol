/**
 * Re-point Quiz 6 attempts/assignments after a section-copy left them on the
 * original quiz id while quiz_sections was moved to the professor-owned copy.
 *
 * Usage:
 *   npx tsx scripts/repair-quiz6-section-mismatch.ts [--dry-run]
 */
import 'dotenv/config';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { assignments, attempts } from '@/app/db/schema';

const OLD_QUIZ_ID = 'f97ebaf0-8468-4208-973e-109d4a97d267';
const NEW_QUIZ_ID = '82ee6f11-9eb8-4941-a76f-3622c708715c';
const SECTION_ID = '7099db7d-c3e2-4b7b-81f1-f69a373f8df8';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const orphanAttempts = await db.query.attempts.findMany({
    where: and(
      eq(attempts.quizId, OLD_QUIZ_ID),
      eq(attempts.sectionId, SECTION_ID),
    ),
    columns: { id: true, studentId: true, submittedAt: true },
  });

  const studentIds = [...new Set(orphanAttempts.map((a) => a.studentId))];

  const orphanAssignments = await db.query.assignments.findMany({
    where: and(
      eq(assignments.quizId, OLD_QUIZ_ID),
      inArray(assignments.studentId, studentIds),
    ),
    columns: { id: true, studentId: true },
  });

  console.log('Section:', SECTION_ID);
  console.log('Old quiz:', OLD_QUIZ_ID);
  console.log('New quiz:', NEW_QUIZ_ID);
  console.log(`Orphan attempts: ${orphanAttempts.length}`);
  console.log(
    `Submitted attempts: ${orphanAttempts.filter((a) => a.submittedAt).length}`,
  );
  console.log(`Assignments to migrate: ${orphanAssignments.length}`);
  console.log(`Distinct students: ${studentIds.length}`);

  if (orphanAttempts.length === 0) {
    console.log('Nothing to repair.');
    return;
  }

  if (dryRun) {
    console.log('Dry run — no writes performed.');
    return;
  }

  await db.transaction(async (tx) => {
    const updatedAttempts = await tx
      .update(attempts)
      .set({ quizId: NEW_QUIZ_ID })
      .where(
        and(
          eq(attempts.quizId, OLD_QUIZ_ID),
          eq(attempts.sectionId, SECTION_ID),
        ),
      )
      .returning({ id: attempts.id });

    let updatedAssignments = 0;
    if (orphanAssignments.length > 0) {
      const rows = await tx
        .update(assignments)
        .set({ quizId: NEW_QUIZ_ID })
        .where(
          and(
            eq(assignments.quizId, OLD_QUIZ_ID),
            inArray(assignments.studentId, studentIds),
          ),
        )
        .returning({ id: assignments.id });
      updatedAssignments = rows.length;
    }

    console.log(`Updated ${updatedAttempts.length} attempts`);
    console.log(`Updated ${updatedAssignments} assignments`);
  });

  const remaining = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attempts)
    .where(
      and(
        eq(attempts.quizId, OLD_QUIZ_ID),
        eq(attempts.sectionId, SECTION_ID),
      ),
    );
  console.log(`Remaining orphan attempts: ${remaining[0]?.count ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
