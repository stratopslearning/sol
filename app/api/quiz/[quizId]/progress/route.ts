import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { assignments, attempts, quizzes } from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 },
      );
    }
    const { assignmentId, answers } = parseResult.data;

    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId),
        eq(assignments.studentId, user.id),
      ),
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, user.id),
        eq(attempts.quizId, quizId),
      ),
    });
    const inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);

    if (!inProgressAttempt) {
      return NextResponse.json(
        { error: 'No in-progress attempt found. Please start the quiz first.' },
        { status: 404 },
      );
    }

    const now = new Date();
    const startedAtDate =
      inProgressAttempt.startedAt instanceof Date
        ? inProgressAttempt.startedAt
        : new Date(inProgressAttempt.startedAt);

    if (quiz.timeLimit && isTimeLimitExceeded(quiz.timeLimit, startedAtDate, now)) {
      return NextResponse.json(
        {
          error: 'Time limit exceeded for this attempt. Please refresh to start a new session.',
          timeLimitExceeded: true,
        },
        { status: 400 },
      );
    }

    await db
      .update(attempts)
      .set({ answers })
      .where(eq(attempts.id, inProgressAttempt.id));

    return NextResponse.json({ success: true, savedAt: now.toISOString() });
  } catch (error) {
    console.error('Error saving quiz progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
