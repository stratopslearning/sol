import { eq, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts, quizVersions, quizzes } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import type { QuizQuestionInput } from '@/lib/professor/mutations';

function normalizeQuestion(q: {
  type: string;
  question: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
  order: number;
}) {
  return JSON.stringify({
    type: q.type,
    question: q.question.trim(),
    options: q.options ?? [],
    correctAnswer: q.correctAnswer ?? '',
    points: q.points,
    order: q.order,
  });
}

export function quizQuestionsChanged(
  existing: Array<{
    type: string;
    question: string;
    options?: string[] | null;
    correctAnswer?: string | null;
    points: number;
    order: number;
  }>,
  incoming: QuizQuestionInput[],
): boolean {
  const a = [...existing]
    .sort((x, y) => x.order - y.order)
    .map(normalizeQuestion)
    .join('|');
  const b = [...incoming]
    .sort((x, y) => x.order - y.order)
    .map((q) =>
      normalizeQuestion({
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        order: q.order,
      }),
    )
    .join('|');
  return a !== b;
}

export async function quizQuestionEditsAreImmutable(quizId: string): Promise<{
  locked: boolean;
  reasons: string[];
}> {
  const [quiz, versionRow, attemptRow] = await Promise.all([
    db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
      columns: { gradesReleasedAt: true },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(quizVersions)
      .where(eq(quizVersions.quizId, quizId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(attempts)
      .where(eq(attempts.quizId, quizId)),
  ]);

  const reasons: string[] = [];
  if ((versionRow[0]?.count ?? 0) > 0) reasons.push('published_versions');
  if (quiz?.gradesReleasedAt) reasons.push('grades_released');
  if ((attemptRow[0]?.count ?? 0) > 0) reasons.push('student_attempts');

  return { locked: reasons.length > 0, reasons };
}

/** Block in-place question edits on published quizzes; metadata edits still allowed. */
export async function assertQuizQuestionsEditable(
  quizId: string,
  existingQuestions: Array<{
    type: string;
    question: string;
    options?: string[] | null;
    correctAnswer?: string | null;
    points: number;
    order: number;
  }>,
  incoming: QuizQuestionInput[],
): Promise<void> {
  if (!quizQuestionsChanged(existingQuestions, incoming)) return;

  const { locked } = await quizQuestionEditsAreImmutable(quizId);
  if (!locked) return;

  throw ApiError.conflict(
    'This quiz has published versions, released grades, or student attempts. Duplicate the quiz or create a new version to change questions.',
  );
}
