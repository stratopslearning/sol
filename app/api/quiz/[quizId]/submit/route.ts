import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, questions, assignments, attempts, quizSections, studentSections } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { gradeShortAnswer, GradingRequest } from '@/lib/grading';
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

    const { assignmentId, answers, startedAt } = await req.json();

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

    // Get quiz details and questions
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
        error: 'This quiz has ended. Submissions are no longer accepted.',
        quizEnded: true 
      }, { status: 400 });
    }

    // Assignment dueDate is secondary - only check if quiz endDate is not set
    // If quiz endDate is extended by professor, it overrides assignment dueDate
    if (!endDate && assignmentDueDate && now > assignmentDueDate) {
      return NextResponse.json({ 
        error: 'The due date for this assignment has passed. Submissions are no longer accepted.',
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
          // #region agent log
          const logData = {location:'submit/route.ts:125',message:'Creating grading request',data:{questionId:question.id,hasCorrectAnswer:!!question.correctAnswer,correctAnswerLength:question.correctAnswer?.length||0,correctAnswerValue:question.correctAnswer?.substring(0,50)||null,hasStudentAnswer:!!userAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
          console.log('[DEBUG]', JSON.stringify(logData));
          fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
          // #endregion
          
          const gradingRequest: GradingRequest = {
            question: question.question,
            studentAnswer: userAnswer,
            correctAnswer: question.correctAnswer || undefined,
            maxPoints: question.points,
            questionType: 'SHORT_ANSWER'
          };

          const gradingResult = await gradeShortAnswer(gradingRequest);
          
          // #region agent log
          const logData = {location:'submit/route.ts:133',message:'Grading result received',data:{score:gradingResult.score,feedback:gradingResult.feedback.substring(0,100),confidence:gradingResult.confidence},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
          console.log('[DEBUG]', JSON.stringify(logData));
          fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
          // #endregion
          totalScore += gradingResult.score;
          gptFeedback[question.id] = {
            score: gradingResult.score,
            feedback: gradingResult.feedback,
            confidence: gradingResult.confidence || 80,
            maxPoints: question.points
          };
        } catch (error) {
          // #region agent log
          const logData = {location:'submit/route.ts:141',message:'Error in submit route catch block',data:{questionId:question.id,errorName:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
          console.log('[DEBUG]', JSON.stringify(logData));
          console.error('[DEBUG ERROR]', error);
          fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
          // #endregion
          
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
    
    // Find in-progress attempt (started but not submitted)
    const inProgressAttempt = existingAttempts.find(a => !a.submittedAt);
    
    // Count only submitted attempts
    const submittedAttempts = existingAttempts.filter(a => a.submittedAt);
    const attemptCount = submittedAttempts.length;

    if (attemptCount >= quiz.maxAttempts) {
      return NextResponse.json({
        error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz. You cannot retake this quiz.`,
        maxAttemptsReached: true
      }, { status: 400 });
    }

    // Get current attempt number
    const currentAttemptNumber = attemptCount + 1;

    // Determine start time: use in-progress attempt's start time, or provided startedAt, or now
    let attemptStartTime: Date;
    if (inProgressAttempt) {
      attemptStartTime = inProgressAttempt.startedAt;
    } else if (startedAt) {
      attemptStartTime = new Date(startedAt);
    } else {
      attemptStartTime = new Date();
    }
    
    const submitTime = new Date();
    const timeElapsedMinutes = (submitTime.getTime() - attemptStartTime.getTime()) / (1000 * 60);
    
    // Validate time limit if set
    if (quiz.timeLimit && timeElapsedMinutes > quiz.timeLimit) {
      return NextResponse.json({ 
        error: `Time limit exceeded. The quiz has a ${quiz.timeLimit} minute time limit, but ${Math.ceil(timeElapsedMinutes)} minutes have elapsed.`,
        timeLimitExceeded: true,
        timeElapsed: Math.ceil(timeElapsedMinutes),
        timeLimit: quiz.timeLimit
      }, { status: 400 });
    }

    // Update existing attempt or create new one
    let attempt;
    if (inProgressAttempt) {
      // Update the existing in-progress attempt
      [attempt] = await db.update(attempts)
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
            maxAttempts: quiz.maxAttempts
          },
          submittedAt: submitTime,
        })
        .where(eq(attempts.id, inProgressAttempt.id))
        .returning();
    } else {
      // Create a new attempt record
      [attempt] = await db.insert(attempts).values({
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
        startedAt: attemptStartTime,
        submittedAt: submitTime,
      }).returning();
    }

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