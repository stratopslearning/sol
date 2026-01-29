import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, assignments, attempts, quizSections, studentSections } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { normalizeDatabaseDate } from '@/lib/utils';

export async function POST(req: NextRequest, context: { params: Promise<{ quizId: string }> }) {
  const params = await context.params;
  const quizId = params.quizId;
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await req.json();

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

    // Get quiz details
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
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

    // Check attempt count against maxAttempts
    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, user.id)
      ),
    });
    const attemptCount = existingAttempts.length;

    if (attemptCount >= quiz.maxAttempts) {
      return NextResponse.json({
        error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
        maxAttemptsReached: true
      }, { status: 400 });
    }

    // Check if there's an in-progress attempt (started but not submitted)
    const inProgressAttempt = existingAttempts.find(a => !a.submittedAt);
    if (inProgressAttempt) {
      let startedAt = inProgressAttempt.startedAt;

      // If the quiz has a time limit and the attempt was started long ago (e.g. student
      // left and came back), the server would reject submit due to "time limit exceeded"
      // while the client timer shows time left. Reset startedAt so the attempt gets a
      // fresh timer when the student resumes.
      const timeLimitMinutes = quiz.timeLimit ?? null;
      if (timeLimitMinutes != null) {
        const elapsedMs = now.getTime() - inProgressAttempt.startedAt.getTime();
        const elapsedMinutes = elapsedMs / (60 * 1000);
        if (elapsedMinutes >= timeLimitMinutes) {
          const [updated] = await db
            .update(attempts)
            .set({ startedAt: now })
            .where(eq(attempts.id, inProgressAttempt.id))
            .returning({ startedAt: attempts.startedAt });
          startedAt = updated?.startedAt ?? now;
        }
      }

      return NextResponse.json({
        success: true,
        attemptId: inProgressAttempt.id,
        startedAt: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
        message: 'Resuming existing attempt'
      });
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

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      message: 'Quiz started'
    });

  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}
