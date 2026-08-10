import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  quizSections,
  quizzes,
  sections,
} from '@/app/db/schema';
import { autoSubmitInProgressAttempt } from '@/lib/autoSubmitInProgressAttempt';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getQuizAvailability } from '@/lib/quizAvailability';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';
import {
  isSectionConcluded,
  SECTION_CONCLUDED_MESSAGE,
} from '@/lib/sectionAvailability';
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
    if (!user) throw ApiError.unauthorized();
    if (user.role === 'STUDENT' && !isStudentEntitled(user)) {
      throw ApiError.paymentRequired();
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
      throw ApiError.badRequest('Invalid request body', parseResult.error.errors);
    }
    const { assignmentId } = parseResult.data;

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
    if (!quiz.isActive) {
      throw new ApiError({
        status: 400,
        message: 'This quiz is no longer available.',
        extras: { quizArchived: true },
      });
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
      throw new ApiError({
        status: 400,
        message: messages[availability.reason],
        extras: { [availability.reason]: true },
      });
    }

    const quizSectionLinks = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId),
    });
    const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
    const sectionId = await resolveAttemptSectionId(user.id, quizSectionIds);
    if (!sectionId) {
      throw ApiError.badRequest('No valid section found for this quiz/assignment');
    }

    const section = await db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });
    if (isSectionConcluded(section, now) && !inProgressAttempt) {
      throw new ApiError({
        status: 400,
        message: SECTION_CONCLUDED_MESSAGE,
        extras: { sectionConcluded: true },
      });
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
        throw new ApiError({
          status: 400,
          message: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
          extras: { maxAttemptsReached: true },
        });
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
      throw new ApiError({
        status: 400,
        message: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
        extras: { maxAttemptsReached: true },
      });
    }

    let attempt;
    try {
      [attempt] = await db
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
    } catch (insertError) {
      // Unique open-attempt index (0007): a concurrent start won — resume it.
      const open = await db.query.attempts.findFirst({
        where: and(
          eq(attempts.assignmentId, assignmentId),
          eq(attempts.studentId, user.id),
          isNull(attempts.submittedAt),
        ),
      });
      if (!open) {
        console.error('Error starting quiz (insert):', insertError);
        throw ApiError.internal('Failed to start quiz');
      }

      const startedAtDate =
        open.startedAt instanceof Date ? open.startedAt : new Date(open.startedAt);
      const timeLimitMinutes = quiz.timeLimit ?? null;
      const remainingSeconds = getRemainingSeconds(
        timeLimitMinutes,
        startedAtDate,
        now,
      );
      const savedAnswers =
        open.answers &&
        typeof open.answers === 'object' &&
        !Array.isArray(open.answers)
          ? (open.answers as Record<string, string>)
          : {};

      return NextResponse.json({
        success: true,
        attemptId: open.id,
        startedAt: startedAtDate.toISOString(),
        answers: savedAnswers,
        timeLimitMinutes,
        remainingSeconds: remainingSeconds ?? null,
        timeLimitExceeded:
          timeLimitMinutes != null &&
          isTimeLimitExceeded(timeLimitMinutes, startedAtDate, now),
        forceAutoSubmit: shouldForceAutoSubmitInProgress({
          quiz,
          assignment,
          startedAt: startedAtDate,
          now,
        }).force,
        resumed: true,
        message: 'Resuming existing attempt',
      });
    }

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
    return apiErrorResponse(error);
  }
}
