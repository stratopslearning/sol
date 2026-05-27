import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { autoSubmitInProgressAttempt } from '@/lib/autoSubmitInProgressAttempt';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getQuizAvailability } from '@/lib/quizAvailability';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';
import { shouldForceAutoSubmitInProgress } from '@/lib/shouldForceAutoSubmit';
import {
  getRemainingSeconds,
  isTimeLimitExceeded,
} from '@/lib/quizTimeLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const startBodySchema = z.object({
  assignmentId: z.string().uuid(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ quizId: string }> }) {
  const params = await context.params;
  const quizId = params.quizId;
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `start:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many quiz start requests. Please wait a moment.',
    });
    if (limited) return limited;

    const rawBody = await req.json().catch(() => null);
    const parseResult = startBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 },
      );
    }
    const { assignmentId } = parseResult.data;

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
    if (!quiz.isActive) {
      return NextResponse.json(
        { error: 'This quiz is no longer available.', quizArchived: true },
        { status: 400 },
      );
    }

    const now = new Date();
    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, user.id),
      ),
    });
    const submittedAttempts = existingAttempts.filter((a) => a.submittedAt != null);
    const inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);

    if (inProgressAttempt) {
      const startedAtDate =
        inProgressAttempt.startedAt instanceof Date
          ? inProgressAttempt.startedAt
          : new Date(inProgressAttempt.startedAt);

      const { force } = shouldForceAutoSubmitInProgress({
        quiz,
        assignment,
        startedAt: startedAtDate,
        now,
      });

      if (force) {
        const autoResult = await autoSubmitInProgressAttempt(
          inProgressAttempt.id,
          now,
        );
        if (autoResult.submitted) {
          return NextResponse.json({
            success: true,
            serverAutoSubmitted: true,
            attemptId: autoResult.attemptId,
            message: 'Your saved answers were submitted automatically.',
          });
        }
      }
    }

    const availability = getQuizAvailability(quiz, assignment, now);
    if (!availability.allowed) {
      const messages = {
        quizNotStarted: 'This quiz has not started yet.',
        quizEnded: 'This quiz has ended.',
        dueDatePassed: 'The due date for this assignment has passed.',
      } as const;
      return NextResponse.json(
        {
          error: messages[availability.reason],
          [availability.reason]: true,
        },
        { status: 400 },
      );
    }

    const quizSectionLinks = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId),
    });
    const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
    const sectionId = await resolveAttemptSectionId(user.id, quizSectionIds);
    if (!sectionId) {
      return NextResponse.json(
        { error: 'No valid section found for this quiz/assignment' },
        { status: 400 },
      );
    }

    if (inProgressAttempt) {
      if (submittedAttempts.length >= quiz.maxAttempts) {
        const autoResult = await autoSubmitInProgressAttempt(
          inProgressAttempt.id,
          now,
        );
        if (autoResult.submitted) {
          return NextResponse.json({
            success: true,
            serverAutoSubmitted: true,
            attemptId: autoResult.attemptId,
            message: 'Your in-progress attempt was submitted.',
          });
        }
        return NextResponse.json(
          {
            error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
            maxAttemptsReached: true,
          },
          { status: 400 },
        );
      }

      const timeLimitMinutes = quiz.timeLimit ?? null;
      const startedAtDate =
        inProgressAttempt.startedAt instanceof Date
          ? inProgressAttempt.startedAt
          : new Date(inProgressAttempt.startedAt);

      const remainingSeconds = getRemainingSeconds(
        timeLimitMinutes,
        startedAtDate,
        now,
      );
      const timeLimitExceeded =
        timeLimitMinutes != null &&
        isTimeLimitExceeded(timeLimitMinutes, startedAtDate, now);
      const forceAutoSubmit = shouldForceAutoSubmitInProgress({
        quiz,
        assignment,
        startedAt: startedAtDate,
        now,
      }).force;

      const savedAnswers =
        inProgressAttempt.answers &&
        typeof inProgressAttempt.answers === 'object' &&
        !Array.isArray(inProgressAttempt.answers)
          ? (inProgressAttempt.answers as Record<string, string>)
          : {};

      return NextResponse.json({
        success: true,
        attemptId: inProgressAttempt.id,
        startedAt: startedAtDate.toISOString(),
        answers: savedAnswers,
        timeLimitMinutes,
        remainingSeconds: remainingSeconds ?? null,
        timeLimitExceeded,
        forceAutoSubmit,
        resumed: true,
        message: forceAutoSubmit
          ? 'Time limit reached — submitting your saved answers now.'
          : 'Resuming existing attempt',
      });
    }

    if (submittedAttempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        {
          error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
          maxAttemptsReached: true,
        },
        { status: 400 },
      );
    }

    const [attempt] = await db
      .insert(attempts)
      .values({
        assignmentId,
        studentId: user.id,
        quizId,
        sectionId,
        answers: {},
        maxScore: 0,
        startedAt: now,
      })
      .returning();

    const timeLimitMinutes = quiz.timeLimit ?? null;
    const remainingSeconds = getRemainingSeconds(
      timeLimitMinutes,
      attempt.startedAt,
      now,
    );

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      answers: {},
      timeLimitMinutes,
      remainingSeconds,
      timeLimitExceeded: false,
      forceAutoSubmit: false,
      resumed: false,
      message: 'Quiz started',
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json({ error: 'Failed to start quiz' }, { status: 500 });
  }
}
