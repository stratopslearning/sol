import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  professorSections,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import type { UserData } from '@/lib/getOrCreateUser';
import { shouldHideFeedbackForStudent } from '@/lib/utils';

/**
 * Whether a professor may view attempts/questions for a quiz (owner or
 * teaches a section the quiz is assigned to). Admins always may.
 */
export async function professorCanAccessQuiz(
  user: Pick<UserData, 'id' | 'role'>,
  quizId: string,
): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'PROFESSOR') return false;

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!quiz) return false;
  if (quiz.professorId === user.id) return true;

  const links = await db.query.quizSections.findMany({
    where: eq(quizSections.quizId, quizId),
  });
  const sectionIds = links.map((l) => l.sectionId);
  if (sectionIds.length === 0) return false;

  const enrollment = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.professorId, user.id),
      inArray(professorSections.sectionId, sectionIds),
    ),
  });
  return Boolean(enrollment);
}

export type AttemptFeedbackFields = {
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  gptFeedback: unknown;
};

/** Strip scores/feedback for students while hide-until-due is active. */
export function redactAttemptFeedbackForViewer<T extends AttemptFeedbackFields>(
  attempt: T,
  quiz: { endDate: Date | null; description: string | null },
  userRole: string,
): T {
  if (!shouldHideFeedbackForStudent(quiz, userRole)) return attempt;
  return {
    ...attempt,
    score: null,
    percentage: null,
    gptFeedback: null,
  };
}

/** Strip answer keys and rubrics for non-author viewers. */
export function stripQuestionSecrets<
  T extends {
    correctAnswer?: unknown;
    rubric?: unknown;
    rubricVersion?: unknown;
  },
>(question: T): T {
  return {
    ...question,
    correctAnswer: null,
    rubric: null,
    rubricVersion: null,
  };
}
