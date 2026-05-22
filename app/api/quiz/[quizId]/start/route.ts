import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  quizSections,
  quizzes,
  studentSections,
} from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  getRemainingSeconds,
  isTimeLimitExceeded,
} from '@/lib/quizTimeLimit';
import { normalizeDatabaseDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

    // Cheap call but it does write to attempts; rate-limit per user to stop a
    // hot loop from spamming attempt rows.
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

    // Verify the assignment belongs to the user
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId),
        eq(assignments.studentId, user.id)
      ),
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get quiz details. Soft-deleted quizzes are presented as not-found.
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

    // Validate quiz availability dates
    // Quiz endDate is the primary control - if professor extends it, quiz becomes available
    // Normalize dates to ensure correct UTC comparison
    const now = new Date();
    const startDate = normalizeDatabaseDate(quiz.startDate);
    const endDate = normalizeDatabaseDate(quiz.endDate);
    const assignmentDueDate = normalizeDatabaseDate(assignment.dueDate);
    
    if (startDate && now < startDate) {
      return NextResponse.json({ 
        error: 'This quiz has not started yet.',
        quizNotStarted: true 
      }, { status: 400 });
    }
    if (endDate && now > endDate) {
      return NextResponse.json({ 
        error: 'This quiz has ended.',
        quizEnded: true 
      }, { status: 400 });
    }

    // Assignment dueDate is secondary - only check if quiz endDate is not set
    // If quiz endDate is extended by professor, it overrides assignment dueDate
    if (!endDate && assignmentDueDate && now > assignmentDueDate) {
      return NextResponse.json({ 
        error: 'The due date for this assignment has passed.',
        dueDatePassed: true 
      }, { status: 400 });
    }

    // Find all sections this quiz is assigned to
    const quizSectionLinks = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId)
    });
    const quizSectionIds = quizSectionLinks.map(qs => qs.sectionId);

    // Find the student's active section enrollment that matches one of these sections
    const studentSection = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, user.id),
        eq(studentSections.status, 'ACTIVE'),
        inArray(studentSections.sectionId, quizSectionIds)
      )
    });
    const sectionId = studentSection ? studentSection.sectionId : null;
    if (!sectionId) {
      return NextResponse.json({ error: 'No valid section found for this quiz/assignment' }, { status: 400 });
    }

    // Load every attempt for this assignment so we can separate submitted (count
    // toward the cap) from in-progress (resumable but never counted twice).
    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, user.id)
      ),
    });
    const submittedAttempts = existingAttempts.filter((a) => a.submittedAt != null);
    let inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);

    // If a resumable in-progress attempt exists, return it without resetting the
    // timer. Resetting would let a student bypass the server-side time limit by
    // simply restarting the quiz after the original window expired.
    if (inProgressAttempt) {
      // Edge case: max submitted attempts already reached but there is still
      // an in-progress row. Submitting it would be rejected by the submit
      // route, so refuse to resume instead of misleading the student.
      if (submittedAttempts.length >= quiz.maxAttempts) {
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

      // Stale in-progress (past limit + grace): delete and start fresh so the
      // student is not trapped by a misleading client timer on an old session.
      if (
        timeLimitMinutes != null &&
        isTimeLimitExceeded(timeLimitMinutes, startedAtDate, now)
      ) {
        await db.delete(attempts).where(eq(attempts.id, inProgressAttempt.id));
        inProgressAttempt = undefined;
      } else {
        const remainingSeconds = getRemainingSeconds(
          timeLimitMinutes,
          startedAtDate,
          now,
        );
        const timeLimitExceeded =
          timeLimitMinutes != null && (remainingSeconds ?? 1) <= 0;

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
          remainingSeconds,
          timeLimitExceeded,
          resumed: true,
          message: timeLimitExceeded
            ? 'Resuming attempt — time limit reached; submit immediately.'
            : 'Resuming existing attempt',
        });
      }
    }

    // No resumable attempt: enforce the cap on the count of *submitted* attempts.
    if (submittedAttempts.length >= quiz.maxAttempts) {
      return NextResponse.json({
        error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
        maxAttemptsReached: true
      }, { status: 400 });
    }

    // Create a new attempt record to track the start time
    const [attempt] = await db.insert(attempts).values({
      assignmentId,
      studentId: user.id,
      quizId: quizId,
      sectionId,
      answers: {}, // Empty answers initially
      maxScore: 0, // Will be calculated on submit
      startedAt: now,
    }).returning();

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
      resumed: false,
      message: 'Quiz started',
    });

  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}
