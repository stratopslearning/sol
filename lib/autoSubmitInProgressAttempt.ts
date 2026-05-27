import { eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { assignments, attempts, quizzes } from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import {
  executeQuizSubmit,
  MaxAttemptsExceededError,
} from '@/lib/executeQuizSubmit';
import { shouldForceAutoSubmitInProgress } from '@/lib/shouldForceAutoSubmit';

export type AutoSubmitAttemptResult =
  | { submitted: true; attemptId: string; reason: string }
  | { submitted: false; reason: 'not_found' | 'already_submitted' | 'not_due' | 'max_attempts' };

/**
 * Finalize a single in-progress attempt when the timer or due date requires it.
 */
export async function autoSubmitInProgressAttempt(
  attemptId: string,
  now: Date = new Date(),
): Promise<AutoSubmitAttemptResult> {
  const row = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      assignment: true,
      quiz: true,
    },
  });

  if (!row || row.submittedAt) {
    return {
      submitted: false,
      reason: row ? 'already_submitted' : 'not_found',
    };
  }

  const quiz = row.quiz;
  const assignment = row.assignment;
  if (!quiz || !assignment) {
    return { submitted: false, reason: 'not_found' };
  }

  const startedAt =
    row.startedAt instanceof Date ? row.startedAt : new Date(row.startedAt);

  const { force, reason } = shouldForceAutoSubmitInProgress({
    quiz,
    assignment,
    startedAt,
    now,
  });
  if (!force) {
    return { submitted: false, reason: 'not_due' };
  }

  const savedAnswers =
    row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
      ? (row.answers as Record<string, string>)
      : {};

  try {
    const result = await executeQuizSubmit({
      quizId: row.quizId,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      answers: savedAnswers,
      autoSubmitted: true,
      bypassAvailability: true,
    });
    return {
      submitted: true,
      attemptId: result.attemptId,
      reason: reason ?? 'timer',
    };
  } catch (error) {
    if (error instanceof MaxAttemptsExceededError) {
      return { submitted: false, reason: 'max_attempts' };
    }
    console.error('[autoSubmitInProgressAttempt] failed', attemptId, error);
    throw error;
  }
}

const SWEEP_BATCH = 40;

/**
 * Server-side safety net: finalize in-progress attempts past timer or due date.
 */
export async function sweepStaleInProgressAttempts(
  now: Date = new Date(),
): Promise<{ scanned: number; submitted: number; results: AutoSubmitAttemptResult[] }> {
  const candidates = await db.query.attempts.findMany({
    where: isNull(attempts.submittedAt),
    with: {
      assignment: true,
      quiz: true,
    },
    limit: SWEEP_BATCH * 3,
    orderBy: (cols, { asc }) => [asc(cols.startedAt)],
  });

  const results: AutoSubmitAttemptResult[] = [];
  let submitted = 0;

  for (const row of candidates) {
    if (results.length >= SWEEP_BATCH) break;
    if (!row.quiz || !row.assignment) continue;
    if (row.quiz.deletedAt) continue;

    const startedAt =
      row.startedAt instanceof Date ? row.startedAt : new Date(row.startedAt);
    const { force } = shouldForceAutoSubmitInProgress({
      quiz: row.quiz,
      assignment: row.assignment,
      startedAt,
      now,
    });
    if (!force) continue;

    const outcome = await autoSubmitInProgressAttempt(row.id, now);
    results.push(outcome);
    if (outcome.submitted) submitted += 1;
  }

  return { scanned: candidates.length, submitted, results };
}
