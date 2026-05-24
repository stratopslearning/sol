import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts, questions, quizzes } from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import {
  buildLegacyQuestionKeyMap,
  resolveAttemptAnswer,
  resolveAttemptFeedback,
} from '@/lib/quizAttemptAnswers';
import { gradeMultipleQuestions, type GradingRequest } from '@/lib/grading';

export const FALLBACK_FEEDBACK_SNIPPET =
  'Grading system temporarily unavailable';

const FEEDBACK_METADATA_KEYS = new Set([
  'maxAttempts',
  'attemptNumber',
  'totalAttempts',
]);

function copyFeedbackMetadata(
  existingFeedback: Record<string, unknown>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(existingFeedback)) {
    if (FEEDBACK_METADATA_KEYS.has(key)) {
      metadata[key] = value;
    }
  }

  return metadata;
}

export function isFallbackGradingFeedback(feedback: unknown): boolean {
  if (!feedback || typeof feedback !== 'object') {
    return false;
  }

  const value = feedback as { feedback?: string; confidence?: number };
  return (
    (typeof value.feedback === 'string' &&
      value.feedback.includes(FALLBACK_FEEDBACK_SNIPPET)) ||
    value.confidence === 30
  );
}

type RegradeAttemptOptions = {
  fallbackOnly?: boolean;
};

export type RegradeAttemptResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  regradedQuestionCount: number;
  fallbackQuestionCount: number;
};

export async function regradeAttempt(
  attemptId: string,
  options: RegradeAttemptOptions = {},
): Promise<RegradeAttemptResult> {
  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
  });

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  if (!attempt.submittedAt) {
    throw new Error('Only submitted attempts can be re-graded');
  }

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, attempt.quizId), activeOnly(quizzes.deletedAt)),
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const quizQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, attempt.quizId),
  });

  const studentAnswers =
    attempt.answers && typeof attempt.answers === 'object'
      ? (attempt.answers as Record<string, unknown>)
      : {};
  const existingFeedback =
    attempt.gptFeedback && typeof attempt.gptFeedback === 'object'
      ? (attempt.gptFeedback as Record<string, unknown>)
      : {};

  const questionKeyMap = buildLegacyQuestionKeyMap(
    quizQuestions.map((question) => ({
      id: question.id,
      order: question.order,
      question: question.question,
      correctAnswer: question.correctAnswer,
    })),
    studentAnswers,
    existingFeedback,
  );

  let totalScore = 0;
  let maxScore = 0;
  const nextFeedback = copyFeedbackMetadata(existingFeedback);
  const shortAnswerGradingRequests: Array<{
    questionId: string;
    request: GradingRequest;
  }> = [];

  let fallbackQuestionCount = 0;

  for (const question of quizQuestions) {
    maxScore += question.points;
    const answerValue = resolveAttemptAnswer(
      question.id,
      studentAnswers,
      questionKeyMap,
    );
    const answerText =
      answerValue === undefined || answerValue === null
        ? ''
        : String(answerValue).trim();

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      if (answerText && answerText === question.correctAnswer) {
        totalScore += question.points;
      }
      continue;
    }

    if (question.type !== 'SHORT_ANSWER') {
      continue;
    }

    const currentFeedback = resolveAttemptFeedback(
      question.id,
      existingFeedback,
      questionKeyMap,
    );

    if (isFallbackGradingFeedback(currentFeedback)) {
      fallbackQuestionCount += 1;
    }

    if (!answerText) {
      nextFeedback[question.id] = {
        score: 0,
        feedback: 'Please read the textbook and try again.',
        confidence: 100,
        maxPoints: question.points,
      };
      continue;
    }

    const shouldRegrade =
      !options.fallbackOnly ||
      isFallbackGradingFeedback(currentFeedback);

    if (!shouldRegrade) {
      const priorScore =
        typeof currentFeedback === 'object' &&
        currentFeedback !== null &&
        'score' in currentFeedback
          ? Number((currentFeedback as { score?: number }).score ?? 0)
          : 0;
      totalScore += priorScore;
      nextFeedback[question.id] = currentFeedback;
      continue;
    }

    shortAnswerGradingRequests.push({
      questionId: question.id,
      request: {
        question: question.question,
        studentAnswer: answerText,
        correctAnswer: question.correctAnswer || undefined,
        maxPoints: question.points,
        questionType: 'SHORT_ANSWER',
      },
    });
  }

  if (shortAnswerGradingRequests.length > 0) {
    const gradingResults = await gradeMultipleQuestions(
      shortAnswerGradingRequests.map((item) => item.request),
    );

    shortAnswerGradingRequests.forEach((item, index) => {
      const gradingResult = gradingResults[index]!;
      totalScore += gradingResult.score;
      nextFeedback[item.questionId] = {
        score: gradingResult.score,
        feedback: gradingResult.feedback,
        confidence: gradingResult.confidence ?? 80,
        maxPoints: item.request.maxPoints,
      };
    });
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passingScore = quiz.passingScore ?? 60;
  const passed = maxScore > 0 ? percentage >= passingScore : false;

  await db
    .update(attempts)
    .set({
      score: totalScore,
      maxScore,
      percentage,
      passed,
      gptFeedback: nextFeedback,
    })
    .where(eq(attempts.id, attemptId));

  return {
    attemptId,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    regradedQuestionCount: shortAnswerGradingRequests.length,
    fallbackQuestionCount,
  };
}
