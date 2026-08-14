import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { assignments, attempts, questions, sections } from '@/app/db/schema';
import { scheduleAttemptRetry } from '@/lib/backgroundRetry';
import { loadExamContext, missingExamResource } from '@/lib/examContext';
import { mergeAttemptAnswers } from '@/lib/shouldForceAutoSubmit';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';
import { assertQuizSubmitWindow } from '@/lib/quizSubmitPolicy';
import { scoreSubmittedQuestions } from '@/lib/scoreSubmittedQuestions';
import {
  isSectionConcluded,
  SECTION_CONCLUDED_MESSAGE,
} from '@/lib/sectionAvailability';

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

  const ctx = await loadExamContext({ quizId, assignmentId, studentId });
  const missing = missingExamResource(ctx.assignment, ctx.quiz);
  if (missing === 'assignment') {
    throw new Error('Assignment not found');
  }
  if (missing === 'quiz') {
    throw new Error('Quiz not found');
  }
  const assignment = ctx.assignment!;
  const quiz = ctx.quiz!;

  const now = new Date();

  const quizSectionIds = ctx.quizSectionLinks.map((qs) => qs.sectionId);
  const sectionId = await resolveAttemptSectionId(studentId, quizSectionIds);
  if (!sectionId) {
    throw new Error('No valid section found for this quiz/assignment');
  }

  const section = await db.query.sections.findFirst({
    where: eq(sections.id, sectionId),
  });
  if (!bypassAvailability && isSectionConcluded(section, now)) {
    throw new Error(SECTION_CONCLUDED_MESSAGE);
  }

  const inProgressAttempt = ctx.inProgressAttempt;
  const attemptCount = ctx.submittedCount;

  if (!inProgressAttempt && attemptCount >= quiz.maxAttempts) {
    throw new MaxAttemptsExceededError(quiz.maxAttempts);
  }

  const submitTime = now;
  const attemptStartTime: Date = inProgressAttempt
    ? inProgressAttempt.startedAt instanceof Date
      ? inProgressAttempt.startedAt
      : new Date(inProgressAttempt.startedAt)
    : submitTime;

  // Only server-trusted bypassAvailability may skip due/end/timer windows.
  // Client autoSubmitted is telemetry only and must never unlock late submits.
  assertQuizSubmitWindow({
    bypassAvailability,
    quiz,
    assignment,
    attemptStartTime,
    submitTime,
  });

  const savedAnswers = inProgressAttempt?.answers ?? {};
  const answers = mergeAttemptAnswers(savedAnswers, incomingAnswers);

  const quizQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
  });

  const { totalScore, maxScore, gptFeedback, pendingQuestionIds } =
    await scoreSubmittedQuestions(quizQuestions, answers);

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
          } as Record<string, unknown>,
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
          } as Record<string, unknown>,
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
