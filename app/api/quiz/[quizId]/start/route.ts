import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, assignments, attempts, quizSections, studentSections } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

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
    const now = new Date();
    if (quiz.startDate && now < quiz.startDate) {
      return NextResponse.json({ 
        error: 'This quiz has not started yet.',
        quizNotStarted: true 
      }, { status: 400 });
    }
    if (quiz.endDate && now > quiz.endDate) {
      return NextResponse.json({ 
        error: 'This quiz has ended.',
        quizEnded: true 
      }, { status: 400 });
    }

    // Assignment dueDate is secondary - only check if quiz endDate is not set
    // If quiz endDate is extended by professor, it overrides assignment dueDate
    if (!quiz.endDate && assignment.dueDate && now > assignment.dueDate) {
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
      // Return the existing attempt's start time
      return NextResponse.json({
        success: true,
        attemptId: inProgressAttempt.id,
        startedAt: inProgressAttempt.startedAt.toISOString(),
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
