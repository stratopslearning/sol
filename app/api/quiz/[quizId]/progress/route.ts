import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { assignments, attempts, quizzes } from '@/app/db/schema';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
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

    const rawBody = await req.json().catch(() => null);
    const parseResult = progressBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid request body', parseResult.error.errors);
    }
    const { assignmentId, answers } = parseResult.data;

    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId),
        eq(assignments.studentId, user.id),
      ),
    });
    if (!assignment) throw ApiError.notFound('Assignment not found');

    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!quiz) throw ApiError.notFound('Quiz not found');

    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, user.id),
        eq(attempts.quizId, quizId),
      ),
    });
    const inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);

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
      .set({ answers })
      .where(eq(attempts.id, inProgressAttempt.id));

    return NextResponse.json({ success: true, savedAt: now.toISOString() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
