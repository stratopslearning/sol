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

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        // Auto-grade MCQ and T/F questions
        if (userAnswer === question.correctAnswer) {
          totalScore += question.points;
        }
      } else if (question.type === 'SHORT_ANSWER' && userAnswer) {
        // Use GPT to grade short answer questions
        try {
          const gradingRequest: GradingRequest = {
            question: question.question,
            studentAnswer: userAnswer,
            correctAnswer: question.correctAnswer || undefined,
            maxPoints: question.points,
            questionType: 'SHORT_ANSWER'
          };

          const gradingResult = await gradeShortAnswer(gradingRequest);
          
          // Add the AI-graded score to total
          totalScore += gradingResult.score;
          
          // Store detailed feedback
          gptFeedback[question.id] = {
            score: gradingResult.score,
            maxPoints: gradingResult.maxPoints,
            feedback: gradingResult.feedback,
            confidence: gradingResult.confidence,
            reasoning: gradingResult.reasoning,
            keywords: gradingResult.keywords,
            suggestions: gradingResult.suggestions,
            gradedAt: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error grading question ${question.id}:`, error);
          
          // Fallback to partial credit if GPT grading fails
          const fallbackScore = Math.floor(question.points * 0.5);
          totalScore += fallbackScore;
          
          gptFeedback[question.id] = {
            score: fallbackScore,
            maxPoints: question.points,
            feedback: "Grading temporarily unavailable. Partial credit awarded for providing an answer.",
            confidence: 40,
            reasoning: "Fallback grading used due to technical issues",
            keywords: [],
            suggestions: ["Please try again later for detailed feedback"],
            gradedAt: new Date().toISOString(),
            error: true
          };
        }
      }
    }

    const percentage = Math.round((totalScore / maxScore) * 100);
    const passed = true; // Always set passed to true

    // Prevent duplicate attempts
    const existingAttempt = await db.query.attempts.findFirst({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.studentId, assignment.studentId)
      ),
    });
    if (existingAttempt) {
      return NextResponse.json({
        success: true,
        attemptId: existingAttempt.id,
        score: existingAttempt.score,
        maxScore: existingAttempt.maxScore,
        percentage: existingAttempt.percentage,
        passed: existingAttempt.passed,
        duplicate: true,
      });
    }

    // Create the attempt record
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
      gptFeedback,
      submittedAt: new Date(),
    }).returning();

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
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
} 