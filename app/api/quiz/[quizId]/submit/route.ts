import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { assignments } from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  executeQuizSubmit,
  MaxAttemptsExceededError,
} from '@/lib/executeQuizSubmit';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_ANSWER_LENGTH = 10_000;
const submitBodySchema = z.object({
  assignmentId: z.string().uuid(),
  answers: z.record(z.string().max(MAX_ANSWER_LENGTH)),
  autoSubmitted: z.boolean().optional().default(false),
});

export async function POST(
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
      key: `submit:${user.id}`,
      limit: 30,
      windowMs: 5 * 60_000,
      prefix: 'rl',
      message: 'Too many quiz submissions. Please wait a moment and try again.',
    });
    if (limited) return limited;

    const rawBody = await req.json().catch(() => null);
    const parseResult = submitBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 },
      );
    }
    const { assignmentId, answers, autoSubmitted } = parseResult.data;

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

    const result = await executeQuizSubmit({
      quizId,
      assignmentId,
      studentId: user.id,
      answers,
      autoSubmitted,
      bypassAvailability: autoSubmitted,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof MaxAttemptsExceededError) {
      return NextResponse.json(
        {
          error: `Maximum attempts (${error.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
          maxAttemptsReached: true,
        },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('not started')) {
        return NextResponse.json(
          { error: error.message, quizNotStarted: true },
          { status: 400 },
        );
      }
      if (error.message.includes('has ended')) {
        return NextResponse.json(
          { error: error.message, quizEnded: true },
          { status: 400 },
        );
      }
      if (error.message.includes('due date')) {
        return NextResponse.json(
          { error: error.message, dueDatePassed: true },
          { status: 400 },
        );
      }
      if (error.message.includes('Time limit exceeded')) {
        return NextResponse.json(
          { error: error.message, timeLimitExceeded: true },
          { status: 400 },
        );
      }
      if (error.message === 'Quiz not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}
