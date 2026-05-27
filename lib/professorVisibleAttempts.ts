/**
 * Professor attempt visibility — section-scoped only.
 *
 * Professors only see attempts recorded under sections they teach
 * (`attempts.section_id`), not attempts from other sections just because
 * the same quiz is assigned there or the learner appears on another roster.
 */
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';

/**
 * Submitted attempts for one quiz, limited to the professor's section ids.
 */
export async function fetchSubmittedAttemptsForProfessorSections(options: {
  quizId: string;
  professorSectionIds: string[];
  /** When set, only attempts stamped with this section (per-section results row). */
  restrictToSectionId?: string;
}) {
  const { quizId, professorSectionIds, restrictToSectionId } = options;
  const scopeSectionIds = restrictToSectionId
    ? professorSectionIds.filter((id) => id === restrictToSectionId)
    : professorSectionIds;

  if (scopeSectionIds.length === 0) return [];

  return db.query.attempts.findMany({
    where: and(
      eq(attempts.quizId, quizId),
      isNotNull(attempts.submittedAt),
      inArray(attempts.sectionId, scopeSectionIds),
    ),
    with: {
      student: true,
      section: { with: { course: true } },
    },
    orderBy: (cols, { desc }) => [desc(cols.submittedAt)],
  });
}

/**
 * Gradebook for one section: best submitted attempt per (student, quiz) where
 * the attempt was taken in THIS section only.
 */
export async function buildGradebookScoresForSection(options: {
  sectionId: string;
  quizIds: string[];
  enrolledStudentIds: string[];
}) {
  const { sectionId, quizIds, enrolledStudentIds } = options;
  if (quizIds.length === 0 || enrolledStudentIds.length === 0) return {};

  const rows = await db.query.attempts.findMany({
    where: and(
      inArray(attempts.quizId, quizIds),
      isNotNull(attempts.submittedAt),
      eq(attempts.sectionId, sectionId),
      inArray(attempts.studentId, enrolledStudentIds),
    ),
    with: { student: true, quiz: true },
  });

  const scores: Record<
    string,
    Record<
      string,
      {
        score: number;
        percentage: number;
        attemptId: string;
        maxScore: number;
      }
    >
  > = {};

  for (const attempt of rows) {
    const pct =
      attempt.percentage ??
      (attempt.maxScore
        ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
        : 0);
    const score = attempt.score ?? 0;
    if (!scores[attempt.studentId]) scores[attempt.studentId] = {};
    const existing = scores[attempt.studentId][attempt.quizId];
    if (
      !existing ||
      pct > existing.percentage ||
      (pct === existing.percentage && score > existing.score)
    ) {
      scores[attempt.studentId][attempt.quizId] = {
        score,
        percentage: pct,
        attemptId: attempt.id,
        maxScore: attempt.maxScore ?? 0,
      };
    }
  }

  return scores;
}
