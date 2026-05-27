import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  questions,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { scheduleAttemptRetry } from '@/lib/backgroundRetry';
import { activeOnly } from '@/lib/db/filters';
import {
  gradeMultipleQuestions,
  outcomeToFeedback,
  type GradingRequest,
} from '@/lib/grading';
import { getOrDeriveRubric } from '@/lib/gradingRubric';
import { getQuizAvailability } from '@/lib/quizAvailability';
import {
  getElapsedMinutes,
  isTimeLimitExceeded,
} from '@/lib/quizTimeLimit';
import { mergeAttemptAnswers } from '@/lib/shouldForceAutoSubmit';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';

export class MaxAttemptsExceededError extends Error {
  constructor(public readonly maxAttempts: number) {
    super('Max attempts exceeded');
    this.name = 'MaxAttemptsExceededError';
  }
}

export type ExecuteQuizSubmitInput = {
  quizId: string;
  assignmentId: string;
  studentId: string;
  answers: Record<string, string>;
  autoSubmitted: boolean;
  /** Timer/due-date auto-submit: allow past quiz end and grace window. */
  bypassAvailability?: boolean;
};

export type ExecuteQuizSubmitResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  totalAttempts: number;
  maxAttempts: number;
  bestScore: number;
  bestPercentage: number;
  attemptsRemaining: number;
  gradingStatus: 'complete' | 'partial';
  pendingQuestionCount: number;
};

export async function executeQuizSubmit(
  input: ExecuteQuizSubmitInput,
): Promise<ExecuteQuizSubmitResult> {
  const {
    quizId,
    assignmentId,
    studentId,
    answers: incomingAnswers,
    autoSubmitted,
    bypassAvailability = false,
  } = input;

  const assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.id, assignmentId),
      eq(assignments.quizId, quizId),
      eq(assignments.studentId, studentId),
    ),
  });
  if (!assignment) {
    throw new Error('Assignment not found');
  }

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const now = new Date();
  if (!bypassAvailability && !autoSubmitted) {
    const availability = getQuizAvailability(quiz, assignment, now);
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

  const quizSectionLinks = await db.query.quizSections.findMany({
    where: eq(quizSections.quizId, quizId),
  });
  const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
  const sectionId = await resolveAttemptSectionId(studentId, quizSectionIds);
  if (!sectionId) {
    throw new Error('No valid section found for this quiz/assignment');
  }

  const existingAttempts = await db.query.attempts.findMany({
    where: and(
      eq(attempts.assignmentId, assignmentId),
      eq(attempts.studentId, studentId),
    ),
  });
  const inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);
  const submittedAttempts = existingAttempts.filter((a) => a.submittedAt != null);
  const attemptCount = submittedAttempts.length;

  if (!inProgressAttempt && attemptCount >= quiz.maxAttempts) {
    throw new MaxAttemptsExceededError(quiz.maxAttempts);
  }

  const submitTime = new Date();
  const attemptStartTime: Date = inProgressAttempt
    ? inProgressAttempt.startedAt instanceof Date
      ? inProgressAttempt.startedAt
      : new Date(inProgressAttempt.startedAt)
    : submitTime;

  const savedAnswers = inProgressAttempt?.answers ?? {};
  const answers = mergeAttemptAnswers(savedAnswers, incomingAnswers);

  if (
    quiz.timeLimit &&
    isTimeLimitExceeded(quiz.timeLimit, attemptStartTime, submitTime) &&
    !autoSubmitted &&
    !bypassAvailability
  ) {
    const timeElapsedMinutes = getElapsedMinutes(attemptStartTime, submitTime);
    throw new Error(
      `Time limit exceeded. The quiz has a ${quiz.timeLimit} minute time limit, but ${Math.ceil(timeElapsedMinutes)} minutes have elapsed.`,
    );
  }

  if (
    quiz.timeLimit &&
    isTimeLimitExceeded(quiz.timeLimit, attemptStartTime, submitTime) &&
    (autoSubmitted || bypassAvailability)
  ) {
    console.warn('[executeQuizSubmit] accepting auto-submit past grace', {
      quizId,
      assignmentId,
      studentId,
      autoSubmitted,
      bypassAvailability,
    });
  }

  const quizQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
  });

  let totalScore = 0;
  let maxScore = 0;
  const gptFeedback: Record<string, unknown> = {};
  const pendingQuestionIds: string[] = [];
  const shortAnswerGradingRequests: Array<{
    questionId: string;
    maxPoints: number;
    request: GradingRequest;
  }> = [];

  for (const question of quizQuestions) {
    const userAnswer = answers[question.id];

    if (!userAnswer || userAnswer.trim?.() === '') {
      maxScore += question.points;
      if (question.type === 'SHORT_ANSWER') {
        gptFeedback[question.id] = {
          score: 0,
          feedback: 'Please read the textbook and try again.',
          confidence: 100,
          maxPoints: question.points,
          status: 'graded',
        };
      }
      continue;
    }

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      maxScore += question.points;
      if (userAnswer === question.correctAnswer) {
        totalScore += question.points;
      }
    } else if (question.type === 'SHORT_ANSWER') {
      const { rubric, rubricVersion } = await getOrDeriveRubric({
        id: question.id,
        question: question.question,
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        rubricVersion: question.rubricVersion ?? 1,
      });
      shortAnswerGradingRequests.push({
        questionId: question.id,
        maxPoints: question.points,
        request: {
          question: question.question,
          studentAnswer: userAnswer,
          correctAnswer: question.correctAnswer || undefined,
          maxPoints: question.points,
          questionType: 'SHORT_ANSWER',
          questionId: question.id,
          rubric,
          rubricVersion,
        },
      });
    }
  }

  if (shortAnswerGradingRequests.length > 0) {
    const gradingResults = await gradeMultipleQuestions(
      shortAnswerGradingRequests.map((item) => item.request),
      { concurrency: 5, perQuestionTimeoutMs: 25_000 },
    );
    shortAnswerGradingRequests.forEach((item, index) => {
      const outcome = gradingResults[index]!;
      const stored = outcomeToFeedback(outcome);
      gptFeedback[item.questionId] = stored;
      if (outcome.status === 'graded') {
        totalScore += outcome.score;
        maxScore += item.maxPoints;
      } else {
        pendingQuestionIds.push(item.questionId);
      }
    });
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passingScore = quiz.passingScore ?? 60;
  const passed = maxScore > 0 ? percentage >= passingScore : false;
  const attemptGradingStatus: 'complete' | 'partial' =
    pendingQuestionIds.length > 0 ? 'partial' : 'complete';
  const currentAttemptNumber = attemptCount + 1;

  const { attempt, allAttempts } = await db.transaction(async (tx) => {
    const txAttempts = await tx.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, studentId),
      ),
    });
    const txInProgress = txAttempts.find((a) => !a.submittedAt);
    const txSubmittedCount = txAttempts.filter((a) => a.submittedAt != null).length;

    if (!txInProgress && txSubmittedCount >= quiz.maxAttempts) {
      throw new MaxAttemptsExceededError(quiz.maxAttempts);
    }

    let savedAttempt;
    if (txInProgress) {
      [savedAttempt] = await tx
        .update(attempts)
        .set({
          answers,
          score: totalScore,
          maxScore,
          percentage,
          passed,
          gptFeedback: {
            ...gptFeedback,
            attemptNumber: currentAttemptNumber,
            totalAttempts: attemptCount + 1,
            maxAttempts: quiz.maxAttempts,
          },
          gradingStatus: attemptGradingStatus,
          submittedAt: submitTime,
        })
        .where(eq(attempts.id, txInProgress.id))
        .returning();
    } else {
      [savedAttempt] = await tx
        .insert(attempts)
        .values({
          assignmentId,
          studentId,
          quizId,
          sectionId,
          answers,
          score: totalScore,
          maxScore,
          percentage,
          passed,
          gptFeedback: {
            ...gptFeedback,
            attemptNumber: currentAttemptNumber,
            totalAttempts: attemptCount + 1,
            maxAttempts: quiz.maxAttempts,
          },
          gradingStatus: attemptGradingStatus,
          startedAt: attemptStartTime,
          submittedAt: submitTime,
        })
        .returning();
    }

    await tx
      .update(assignments)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(assignments.id, assignmentId));

    const refreshed = await tx.query.attempts.findMany({
      where: eq(attempts.assignmentId, assignmentId),
    });

    return { attempt: savedAttempt, allAttempts: refreshed };
  });

  if (pendingQuestionIds.length > 0) {
    scheduleAttemptRetry(attempt.id);
  }

  const bestScore = Math.max(...allAttempts.map((a) => a.score || 0));
  const bestPercentage = maxScore > 0 ? Math.round((bestScore / maxScore) * 100) : 0;

  return {
    attemptId: attempt.id,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    attemptNumber: currentAttemptNumber,
    totalAttempts: attemptCount + 1,
    maxAttempts: quiz.maxAttempts,
    bestScore,
    bestPercentage,
    attemptsRemaining: quiz.maxAttempts - (attemptCount + 1),
    gradingStatus: attemptGradingStatus,
    pendingQuestionCount: pendingQuestionIds.length,
  };
}
