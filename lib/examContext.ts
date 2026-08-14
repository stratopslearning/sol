import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';

export type ExamAssignment = typeof assignments.$inferSelect;
export type ExamQuiz = typeof quizzes.$inferSelect;
export type ExamAttempt = typeof attempts.$inferSelect;
export type ExamQuizSection = typeof quizSections.$inferSelect;

export type ExamContext = {
  assignment: ExamAssignment | undefined;
  quiz: ExamQuiz | undefined;
  inProgressAttempt: ExamAttempt | undefined;
  submittedCount: number;
  quizSectionLinks: ExamQuizSection[];
};

/**
 * Exam rows in two waves so a missing assignment/quiz does not also check
 * out attempt and section connections. Callers must still apply checks in
 * the original order (assignment → quiz → section → window) so the
 * winning error does not change.
 */
export async function loadExamContext(args: {
  quizId: string;
  assignmentId: string;
  studentId: string;
  includeSections?: boolean;
  includeSubmittedAttempts?: boolean;
}): Promise<ExamContext> {
  const {
    quizId,
    assignmentId,
    studentId,
    includeSections = true,
    includeSubmittedAttempts = true,
  } = args;

  const [assignment, quiz] = await Promise.all([
    db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId),
        eq(assignments.studentId, studentId),
      ),
    }),
    db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    }),
  ]);

  if (!assignment || !quiz) {
    return {
      assignment,
      quiz,
      inProgressAttempt: undefined,
      submittedCount: 0,
      quizSectionLinks: [],
    };
  }

  const [inProgressAttempt, submittedAttempts, quizSectionLinks] =
    await Promise.all([
      db.query.attempts.findFirst({
        where: and(
          eq(attempts.assignmentId, assignmentId),
          eq(attempts.studentId, studentId),
          isNull(attempts.submittedAt),
        ),
      }),
      includeSubmittedAttempts
        ? db.query.attempts.findMany({
            where: and(
              eq(attempts.assignmentId, assignmentId),
              eq(attempts.studentId, studentId),
              isNotNull(attempts.submittedAt),
            ),
            columns: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
      includeSections
        ? db.query.quizSections.findMany({
            where: eq(quizSections.quizId, quizId),
          })
        : Promise.resolve([] as ExamQuizSection[]),
    ]);

  return {
    assignment,
    quiz,
    inProgressAttempt: inProgressAttempt ?? undefined,
    submittedCount: submittedAttempts.length,
    quizSectionLinks,
  };
}

/**
 * Which required row is missing. Assignment wins when both are absent —
 * the same order start/submit used before parallel fetch.
 */
export function missingExamResource(
  assignment: unknown,
  quiz: unknown,
): 'assignment' | 'quiz' | null {
  if (!assignment) return 'assignment';
  if (!quiz) return 'quiz';
  return null;
}
