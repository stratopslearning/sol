import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, questions, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the original quiz with questions
    const originalQuiz = await db.query.quizzes.findFirst({
      where: and(
        eq(quizzes.id, quizId),
        eq(quizzes.professorId, user.id)
      ),
      with: {
        questions: {
          orderBy: questions.order,
        },
      },
    });

    if (!originalQuiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Create a copy of the quiz
    const [duplicatedQuiz] = await db.insert(quizzes).values({
      title: `${originalQuiz.title} (Copy)`,
      description: originalQuiz.description,
      courseId: originalQuiz.courseId,
      professorId: user.id,
      maxAttempts: originalQuiz.maxAttempts,
      timeLimit: originalQuiz.timeLimit,
      startDate: null, // Reset dates for the copy
      endDate: null,
      isActive: false, // Start as inactive
    }).returning();

    // Copy all questions
    const questionsToInsert = originalQuiz.questions.map((question, index) => ({
      quizId: duplicatedQuiz.id,
      type: question.type,
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      points: question.points,
      order: index + 1,
    }));

    await db.insert(questions).values(questionsToInsert);

    return NextResponse.json({
      success: true,
      quizId: duplicatedQuiz.id,
      message: 'Quiz duplicated successfully',
    });

  } catch (error) {
    console.error('Error duplicating quiz:', error);
    return NextResponse.json({
      error: 'Failed to duplicate quiz',
    }, { status: 500 });
  }
} 