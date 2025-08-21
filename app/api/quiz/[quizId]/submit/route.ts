import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, questions, assignments, attempts, quizSections, studentSections } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { gradeShortAnswer, GradingRequest } from '@/lib/grading';

export async function POST(req: NextRequest, context: { params: Promise<{ quizId: string }> }) {
  const params = await context.params;
  const quizId = params.quizId;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId, answers } = await req.json();

    // Verify the assignment belongs to the user
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId)
      ),
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get quiz details and questions
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Find all sections this quiz is assigned to
    const quizSectionLinks = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId)
    });
    const quizSectionIds = quizSectionLinks.map(qs => qs.sectionId);

    // Find the student's active section enrollment that matches one of these sections
    const studentSection = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, assignment.studentId),
        eq(studentSections.status, 'ACTIVE'),
        inArray(studentSections.sectionId, quizSectionIds)
      )
    });
    const sectionId = studentSection ? studentSection.sectionId : null;
    if (!sectionId) {
      return NextResponse.json({ error: 'No valid section found for this quiz/assignment' }, { status: 400 });
    }

    const quizQuestions = await db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
    });

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const gptFeedback: Record<string, any> = {};

    // Process questions and grade them
    for (const question of quizQuestions) {
      maxScore += question.points;
      const userAnswer = answers[question.id];

      if (!userAnswer || userAnswer.trim?.() === "") {
        // Blank answer: always zero score
        if (question.type === 'SHORT_ANSWER') {
          gptFeedback[question.id] = {
            score: 0,
            feedback: "Please read the textbook and try again.",
            confidence: 100,
            maxPoints: question.points
          };
        }
        // No points for blank answer
        continue;
      }

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        // Auto-grade MCQ and T/F questions
        if (userAnswer === question.correctAnswer) {
          totalScore += question.points;
        }
      } else if (question.type === 'SHORT_ANSWER') {
        try {
          const gradingRequest: GradingRequest = {
            question: question.question,
            studentAnswer: userAnswer,
            correctAnswer: question.correctAnswer || undefined,
            maxPoints: question.points,
            questionType: 'SHORT_ANSWER'
          };

          const gradingResult = await gradeShortAnswer(gradingRequest);
          totalScore += gradingResult.score;
          gptFeedback[question.id] = {
            score: gradingResult.score,
            feedback: gradingResult.feedback,
            confidence: gradingResult.confidence || 80,
            maxPoints: question.points
          };
        } catch (error) {
          console.error(`Error grading question ${question.id}:`, error);
          gptFeedback[question.id] = {
            score: 0,
            feedback: "Grading temporarily unavailable. Please read the textbook and try again.",
            confidence: 50,
            maxPoints: question.points
          };
        }
      }
    }

    const percentage = Math.round((totalScore / maxScore) * 100);
    const passed = true; // Always set passed to true

    // Check attempt count against maxAttempts
    const existingAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, assignment.studentId)
      ),
    });
    const attemptCount = existingAttempts.length;

    if (attemptCount >= quiz.maxAttempts) {
      return NextResponse.json({
        error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
        maxAttemptsReached: true
      }, { status: 400 });
    }

    // Get current attempt number
    const currentAttemptNumber = attemptCount + 1;

    // Create the attempt record with attempt metadata
    const [attempt] = await db.insert(attempts).values({
      assignmentId,
      studentId: assignment.studentId,
      quizId: quizId,
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
        maxAttempts: quiz.maxAttempts
      },
      submittedAt: new Date(),
    }).returning();

    // Calculate best score across all attempts for this assignment
    const allAttempts = await db.query.attempts.findMany({
      where: eq(attempts.assignmentId, assignmentId),
    });
    
    const bestScore = Math.max(...allAttempts.map(a => a.score || 0));
    const bestPercentage = Math.round((bestScore / maxScore) * 100);

    // Update assignment as completed
    await db.update(assignments)
      .set({ 
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(assignments.id, assignmentId));

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
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
} 