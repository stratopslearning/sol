/**
 * Background grader for `pending` short-answer questions.
 *
 * Hit by Vercel Cron every minute (see `vercel.json`). The worker:
 *   1. Finds at most `BATCH_LIMIT` attempts with `grading_status IN
 *      ('partial', 'failed')`.
 *   2. For each attempt, regrades the questions still marked pending/manual_review.
 *   3. After 3 attempts a question is promoted to `manual_review` and is no
 *      longer retried automatically — professors see a flag and can override.
 *
 * Auth: requires the `Authorization: Bearer ${CRON_SECRET}` header. Vercel
 * Cron sets this automatically when configured.
 */
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  attempts,
  questions as questionsTable,
  quizzes as quizzesTable,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import {
  gradeMultipleQuestions,
  outcomeToFeedback,
  type GradingRequest,
} from '@/lib/grading';
import { getOrDeriveRubric } from '@/lib/gradingRubric';
import {
  buildLegacyQuestionKeyMap,
  resolveAttemptAnswer,
  resolveAttemptFeedback,
} from '@/lib/quizAttemptAnswers';
import { isPendingStatus, type StoredFeedback } from '@/lib/gradingTypes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_LIMIT = 10;
const MAX_GRADING_ATTEMPTS = 3;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

type AttemptRow = typeof attempts.$inferSelect;

async function gradePendingForAttempt(attempt: AttemptRow): Promise<{
  attemptId: string;
  regraded: number;
  stillPending: number;
  promoted: number;
}> {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzesTable.id, attempt.quizId), activeOnly(quizzesTable.deletedAt)),
  });
  if (!quiz) {
    return { attemptId: attempt.id, regraded: 0, stillPending: 0, promoted: 0 };
  }

  const quizQuestions = await db.query.questions.findMany({
    where: eq(questionsTable.quizId, attempt.quizId),
  });

  const studentAnswers =
    attempt.answers && typeof attempt.answers === 'object'
      ? (attempt.answers as Record<string, unknown>)
      : {};
  const existingFeedback =
    attempt.gptFeedback && typeof attempt.gptFeedback === 'object'
      ? (attempt.gptFeedback as Record<string, unknown>)
      : {};

  const keyMap = buildLegacyQuestionKeyMap(
    quizQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      question: q.question,
      correctAnswer: q.correctAnswer,
    })),
    studentAnswers,
    existingFeedback,
  );

  const nextFeedback: Record<string, unknown> = { ...existingFeedback };
  let totalScore = 0;
  let maxScore = 0;
  const requests: Array<{
    questionId: string;
    maxPoints: number;
    previousAttempts: number;
    request: GradingRequest;
  }> = [];

  for (const question of quizQuestions) {
    const answerValue = resolveAttemptAnswer(question.id, studentAnswers, keyMap);
    const answerText =
      answerValue === undefined || answerValue === null
        ? ''
        : String(answerValue).trim();

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      maxScore += question.points;
      if (answerText && answerText === question.correctAnswer) {
        totalScore += question.points;
      }
      continue;
    }

    if (question.type !== 'SHORT_ANSWER') continue;

    const current = resolveAttemptFeedback(
      question.id,
      existingFeedback,
      keyMap,
    ) as StoredFeedback | undefined;

    // Already-graded questions keep their score; skipped (empty answer) ones
    // are 0 with full points counted.
    if (!answerText) {
      maxScore += question.points;
      nextFeedback[question.id] = {
        score: 0,
        feedback: 'Please read the textbook and try again.',
        confidence: 100,
        maxPoints: question.points,
        status: 'graded',
      } satisfies StoredFeedback;
      continue;
    }

    if (!isPendingStatus(current?.status)) {
      const priorScore = current && typeof current.score === 'number' ? current.score : 0;
      maxScore += question.points;
      totalScore += priorScore;
      // Keep existing entry exactly as it is.
      if (current) nextFeedback[question.id] = current;
      continue;
    }

    // This question needs re-grading.
    const { rubric, rubricVersion } = await getOrDeriveRubric({
      id: question.id,
      question: question.question,
      correctAnswer: question.correctAnswer,
      rubric: question.rubric,
      rubricVersion: question.rubricVersion ?? 1,
    });

    requests.push({
      questionId: question.id,
      maxPoints: question.points,
      previousAttempts: current?.attempts ?? 0,
      request: {
        question: question.question,
        studentAnswer: answerText,
        correctAnswer: question.correctAnswer || undefined,
        maxPoints: question.points,
        questionType: 'SHORT_ANSWER',
        questionId: question.id,
        rubric,
        rubricVersion,
      },
    });
  }

  let regraded = 0;
  let stillPending = 0;
  let promoted = 0;

  if (requests.length > 0) {
    const outcomes = await gradeMultipleQuestions(
      requests.map((r) => r.request),
      { concurrency: 3, perQuestionTimeoutMs: 40_000 },
    );

    requests.forEach((item, index) => {
      const outcome = outcomes[index]!;
      const stored = outcomeToFeedback(outcome, {
        previousAttempts: item.previousAttempts,
      });

      if (
        stored.status === 'pending' &&
        (stored.attempts ?? 0) >= MAX_GRADING_ATTEMPTS
      ) {
        stored.status = 'manual_review';
        promoted += 1;
      }

      nextFeedback[item.questionId] = stored;

      if (stored.status === 'graded') {
        maxScore += item.maxPoints;
        totalScore += stored.score ?? 0;
        regraded += 1;
      } else {
        stillPending += 1;
      }
    });
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passingScore = quiz.passingScore ?? 60;
  const passed = maxScore > 0 ? percentage >= passingScore : false;
  const gradingStatus: 'complete' | 'partial' | 'failed' =
    stillPending === 0
      ? 'complete'
      : promoted > 0 ||
          Object.values(nextFeedback).some(
            (entry) =>
              entry &&
              typeof entry === 'object' &&
              (entry as StoredFeedback).status === 'manual_review',
          )
        ? 'failed'
        : 'partial';

  await db
    .update(attempts)
    .set({
      score: totalScore,
      maxScore,
      percentage,
      passed,
      gptFeedback: nextFeedback,
      gradingStatus,
    })
    .where(eq(attempts.id, attempt.id));

  return { attemptId: attempt.id, regraded, stillPending, promoted };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pendingAttempts = await db.query.attempts.findMany({
      // Both 'partial' (some questions still pending) and 'failed' (worker
      // gave up after retries) are eligible. 'failed' rows are usually
      // resolved by professor regrade but we still retry once per cron tick
      // in case the underlying transient issue cleared.
      where: inArray(attempts.gradingStatus, ['partial', 'failed']),
      limit: BATCH_LIMIT,
      orderBy: (cols, { asc }) => [asc(cols.submittedAt)],
    });

    if (pendingAttempts.length === 0) {
      return NextResponse.json({ processed: 0, attempts: [] });
    }

    const results = [] as Array<{
      attemptId: string;
      regraded: number;
      stillPending: number;
      promoted: number;
    }>;

    for (const attempt of pendingAttempts) {
      try {
        const result = await gradePendingForAttempt(attempt);
        results.push(result);
      } catch (error) {
        console.error('cron grade-pending failed for attempt', attempt.id, error);
      }
    }

    return NextResponse.json({
      processed: results.length,
      attempts: results,
    });
  } catch (error) {
    console.error('cron grade-pending error', error);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}

// Allow POST as well so Vercel Cron's POST configuration works too.
export const POST = GET;
