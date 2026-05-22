import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  questions,
  quizSections,
  quizzes,
  studentSections,
} from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { gradeMultipleQuestions, type GradingRequest } from '@/lib/grading';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  getElapsedMinutes,
  isTimeLimitExceeded,
} from '@/lib/quizTimeLimit';
import { normalizeDatabaseDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Hard input cap: each answer is a string (MCQ id, short-answer text, etc).
// 10kB per answer is generous; reject anything larger so a malicious caller
// can't drive the AI grading endpoint into expensive territory.
const MAX_ANSWER_LENGTH = 10_000;
const submitBodySchema = z.object({
  assignmentId: z.string().uuid(),
  answers: z.record(z.string().max(MAX_ANSWER_LENGTH)),
});

class MaxAttemptsExceededError extends Error {
  constructor(public readonly maxAttempts: number) {
    super('Max attempts exceeded');
    this.name = 'MaxAttemptsExceededError';
  }
}

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

    // OpenAI grading is the most expensive call in the system. Cap each
    // student to a tight per-minute budget to prevent wallet drain via a
    // submit-spamming script.
    const limited = await enforceRateLimit({
      key: `submit:${user.id}`,
      limit: 30,
      windowMs: 5 * 60_000,
      prefix: 'rl',
      message: 'Too many quiz submissions. Please wait a moment and try again.',
    });
    if (limited) return limited;

    // Parse + validate body. We deliberately do NOT trust client-supplied
    // `startedAt`; the server uses the persisted in-progress attempt instead.
    const rawBody = await req.json().catch(() => null);
    const parseResult = submitBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 },
      );
    }
    const { assignmentId, answers } = parseResult.data;

    // Verify the assignment belongs to the user
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

    // Get quiz (soft-deleted quizzes are 404 to mirror dashboard listings).
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Validate quiz availability dates (server is authoritative for window).
    const now = new Date();
    const startDate = normalizeDatabaseDate(quiz.startDate);
    const endDate = normalizeDatabaseDate(quiz.endDate);
    const assignmentDueDate = normalizeDatabaseDate(assignment.dueDate);

    if (startDate && now < startDate) {
      return NextResponse.json(
        { error: 'This quiz has not started yet.', quizNotStarted: true },
        { status: 400 },
      );
    }
    if (endDate && now > endDate) {
      return NextResponse.json(
        { error: 'This quiz has ended. Submissions are no longer accepted.', quizEnded: true },
        { status: 400 },
      );
    }
    if (!endDate && assignmentDueDate && now > assignmentDueDate) {
      return NextResponse.json(
        {
          error: 'The due date for this assignment has passed. Submissions are no longer accepted.',
          dueDatePassed: true,
        },
        { status: 400 },
      );
    }

    // Resolve the section context the student is taking the quiz under.
    const quizSectionLinks = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId),
    });
    const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);

    const studentSection = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, assignment.studentId),
        eq(studentSections.status, 'ACTIVE'),
        inArray(studentSections.sectionId, quizSectionIds),
      ),
    });
    const sectionId = studentSection ? studentSection.sectionId : null;
    if (!sectionId) {
      return NextResponse.json(
        { error: 'No valid section found for this quiz/assignment' },
        { status: 400 },
      );
    }

    // Load attempt history before any grading — we MUST validate caps and the
    // time limit before invoking expensive AI grading, otherwise a rejected
    // submission still incurs cost.
    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, assignment.studentId),
      ),
    });
    const inProgressAttempt = existingAttempts.find((a) => !a.submittedAt);
    const submittedAttempts = existingAttempts.filter((a) => a.submittedAt != null);
    const attemptCount = submittedAttempts.length;

    if (attemptCount >= quiz.maxAttempts) {
      return NextResponse.json(
        {
          error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
          maxAttemptsReached: true,
        },
        { status: 400 },
      );
    }

    // Server-authoritative start time. We never trust a client-supplied
    // `startedAt` value — it could be spoofed to bypass the time limit. If no
    // in-progress attempt exists we fall back to "now" (zero elapsed) which is
    // the safest interpretation: the student opens and submits in the same
    // request and the time limit cannot be cheated.
    const submitTime = new Date();
    const attemptStartTime: Date = inProgressAttempt
      ? inProgressAttempt.startedAt
      : submitTime;

    if (
      quiz.timeLimit &&
      isTimeLimitExceeded(quiz.timeLimit, attemptStartTime, submitTime)
    ) {
      const timeElapsedMinutes = getElapsedMinutes(attemptStartTime, submitTime);
      return NextResponse.json(
        {
          error: `Time limit exceeded. The quiz has a ${quiz.timeLimit} minute time limit, but ${Math.ceil(timeElapsedMinutes)} minutes have elapsed.`,
          timeLimitExceeded: true,
          timeElapsed: Math.ceil(timeElapsedMinutes),
          timeLimit: quiz.timeLimit,
        },
        { status: 400 },
      );
    }

    // Now safe to load questions and run grading.
    const quizQuestions = await db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
    });

    let totalScore = 0;
    let maxScore = 0;
    const gptFeedback: Record<string, any> = {};
    const shortAnswerGradingRequests: Array<{
      questionId: string;
      request: GradingRequest;
    }> = [];

    for (const question of quizQuestions) {
      maxScore += question.points;
      const userAnswer = answers[question.id];

      if (!userAnswer || userAnswer.trim?.() === '') {
        if (question.type === 'SHORT_ANSWER') {
          gptFeedback[question.id] = {
            score: 0,
            feedback: 'Please read the textbook and try again.',
            confidence: 100,
            maxPoints: question.points,
          };
        }
        continue;
      }

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        if (userAnswer === question.correctAnswer) {
          totalScore += question.points;
        }
      } else if (question.type === 'SHORT_ANSWER') {
        shortAnswerGradingRequests.push({
          questionId: question.id,
          request: {
            question: question.question,
            studentAnswer: userAnswer,
            correctAnswer: question.correctAnswer || undefined,
            maxPoints: question.points,
            questionType: 'SHORT_ANSWER',
          },
        });
      }
    }

    if (shortAnswerGradingRequests.length > 0) {
      const gradingResults = await gradeMultipleQuestions(
        shortAnswerGradingRequests.map((item) => item.request),
      );
      shortAnswerGradingRequests.forEach((item, index) => {
        const gradingResult = gradingResults[index];
        totalScore += gradingResult.score;
        gptFeedback[item.questionId] = {
          score: gradingResult.score,
          feedback: gradingResult.feedback,
          confidence: gradingResult.confidence || 80,
          maxPoints: item.request.maxPoints,
        };
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    // Compare against the quiz's configured passing percentage. If maxScore
    // is 0 (a quiz with no graded questions, e.g. all-open-text-without-rubric)
    // there's no meaningful pass/fail, so we record `false`.
    const passingScore = quiz.passingScore ?? 60;
    const passed = maxScore > 0 ? percentage >= passingScore : false;

    const currentAttemptNumber = attemptCount + 1;

    // Atomic write: re-verify the attempt cap inside the transaction so that
    // two concurrent submits cannot each see the same "attempts so far" count
    // and both succeed past the limit. The transaction also wraps the
    // attempt insert/update and assignment-completion update so partial
    // failures cannot leave attempts orphaned from the assignment update.
    const { attempt, allAttempts } = await db.transaction(async (tx) => {
      const txAttempts = await tx.query.attempts.findMany({
        where: and(
          eq(attempts.assignmentId, assignmentId),
          eq(attempts.studentId, assignment.studentId),
        ),
      });
      const txInProgress = txAttempts.find((a) => !a.submittedAt);
      const txSubmittedCount = txAttempts.filter((a) => a.submittedAt != null).length;
      if (txSubmittedCount >= quiz.maxAttempts) {
        // Convert to an error the outer try will translate into a 400.
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
            },
            submittedAt: submitTime,
          })
          .where(eq(attempts.id, txInProgress.id))
          .returning();
      } else {
        [savedAttempt] = await tx
          .insert(attempts)
          .values({
            assignmentId,
            studentId: assignment.studentId,
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
            },
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

    const bestScore = Math.max(...allAttempts.map((a) => a.score || 0));
    const bestPercentage = maxScore > 0 ? Math.round((bestScore / maxScore) * 100) : 0;

    return NextResponse.json({
      success: true,
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
    });
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
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}
