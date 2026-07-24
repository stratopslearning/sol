import { getQuizAvailability } from '@/lib/quizAvailability';
import {
  getElapsedMinutes,
  isTimeLimitExceeded,
} from '@/lib/quizTimeLimit';

/**
 * Enforce due-date / end-date / time-limit rules for quiz submit.
 *
 * `bypassAvailability` is server-trusted only (e.g. autoSubmitInProgressAttempt).
 * Client `autoSubmitted` must never be mapped to bypass.
 */
export function assertQuizSubmitWindow(opts: {
  bypassAvailability: boolean;
  quiz: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    timeLimit?: number | null;
  };
  assignment: { dueDate?: Date | string | null };
  attemptStartTime: Date;
  submitTime?: Date;
}): void {
  const {
    bypassAvailability,
    quiz,
    assignment,
    attemptStartTime,
    submitTime = new Date(),
  } = opts;

  if (!bypassAvailability) {
    const availability = getQuizAvailability(quiz, assignment, submitTime);
    if (!availability.allowed) {
      throw new Error(
        availability.reason === 'quizNotStarted'
          ? 'This quiz has not started yet.'
          : availability.reason === 'quizEnded'
            ? 'This quiz has ended. Submissions are no longer accepted.'
            : 'The due date for this assignment has passed. Submissions are no longer accepted.',
      );
    }
  }

  if (
    quiz.timeLimit &&
    isTimeLimitExceeded(quiz.timeLimit, attemptStartTime, submitTime) &&
    !bypassAvailability
  ) {
    const timeElapsedMinutes = getElapsedMinutes(attemptStartTime, submitTime);
    throw new Error(
      `Time limit exceeded. The quiz has a ${quiz.timeLimit} minute time limit, but ${Math.ceil(timeElapsedMinutes)} minutes have elapsed.`,
    );
  }
}
