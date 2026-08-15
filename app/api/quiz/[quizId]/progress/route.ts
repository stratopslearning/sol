import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  QUIZ_ANSWERS_JSON_MAX_BYTES,
  readJsonBody,
} from '@/lib/api/readJsonBody';
import { sanitizeAnswerRecord } from '@/lib/api/sanitizeStoredText';
import { loadExamContext, missingExamResource } from '@/lib/examContext';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';
import { isTimeLimitExceeded } from '@/lib/quizTimeLimit';

export const dynamic = 'force-dynamic';

const MAX_ANSWER_LENGTH = 10_000;

const progressBodySchema = z.object({
  assignmentId: z.string().uuid(),
  answers: z.record(z.string().max(MAX_ANSWER_LENGTH)),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> },
) {
  const params = await context.params;
  const quizId = params.quizId;

  try {
    const user = await getOrCreateUser();
    if (!user) throw ApiError.unauthorized();
    if (user.role === 'STUDENT' && !isStudentEntitled(user)) {
      throw ApiError.paymentRequired();
    }

    const limited = await enforceRateLimit({
      key: `progress:${user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many save requests. Please wait a moment.',
    });
    if (limited) return limited;

    const rawBody = await readJsonBody(req, {
      maxBytes: QUIZ_ANSWERS_JSON_MAX_BYTES,
    });
    const parseResult = progressBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid request body', parseResult.error.errors);
    }
    const { assignmentId, answers } = parseResult.data;
    const sanitizedAnswers = sanitizeAnswerRecord(answers);

    const ctx = await loadExamContext({
      quizId,
      assignmentId,
      studentId: user.id,
      includeSections: false,
      includeSubmittedAttempts: false,
    });
    const missing = missingExamResource(ctx.assignment, ctx.quiz);
    if (missing === 'assignment') throw ApiError.notFound('Assignment not found');
    if (missing === 'quiz') throw ApiError.notFound('Quiz not found');
    const quiz = ctx.quiz!;

    const inProgressAttempt = ctx.inProgressAttempt;

    if (!inProgressAttempt) {
      throw ApiError.notFound(
        'No in-progress attempt found. Please start the quiz first.',
      );
    }

    const now = new Date();
    const startedAtDate =
      inProgressAttempt.startedAt instanceof Date
        ? inProgressAttempt.startedAt
        : new Date(inProgressAttempt.startedAt);

    if (quiz.timeLimit && isTimeLimitExceeded(quiz.timeLimit, startedAtDate, now)) {
      throw new ApiError({
        status: 400,
        message:
          'Time limit exceeded for this attempt. Please refresh to start a new session.',
        extras: { timeLimitExceeded: true },
      });
    }

    await db
      .update(attempts)
      .set({ answers: sanitizedAnswers })
      .where(eq(attempts.id, inProgressAttempt.id));

    return NextResponse.json({ success: true, savedAt: now.toISOString() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
