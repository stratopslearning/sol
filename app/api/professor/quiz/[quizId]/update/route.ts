import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, questions, courses, users, quizCourses } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating quiz
const updateQuizSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  courseIds: z.array(z.string()).min(1),
  maxAttempts: z.number().min(1).max(10),
  timeLimit: z.number().min(1).max(180),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  isActive: z.boolean(),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
    question: z.string().min(1),
    points: z.number().min(1),
    options: z.array(z.string()).nullable().optional(),
    correctAnswer: z.string().nullable().optional(),
    order: z.number(),
  })).min(1),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export async function PUT(
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

    // Verify the quiz belongs to the professor
    const existingQuiz = await db.query.quizzes.findFirst({
      where: and(
        eq(quizzes.id, quizId),
        eq(quizzes.professorId, user.id)
      ),
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateQuizSchema.parse(body);

    // Verify all courses belong to the professor (or admin)
    for (const courseId of validatedData.courseIds) {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });
      if (!course || ((user.role as any) !== 'ADMIN' && course.professorId !== user.id)) {
        return NextResponse.json({ error: 'Course not found or access denied' }, { status: 403 });
      }
    }

    // Update the quiz (assign to first course for legacy field, but use quizCourses for assignment)
    const [updatedQuiz] = await db.update(quizzes)
      .set({
        title: validatedData.title,
        description: validatedData.description || null,
        courseId: validatedData.courseIds[0],
        maxAttempts: validatedData.maxAttempts,
        timeLimit: validatedData.timeLimit,
        startDate: validatedData.startDate || null,
        endDate: validatedData.endDate || null,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    // Remove old assignments
    await db.delete(quizCourses).where(eq(quizCourses.quizId, quizId));
    // Assign quiz to courses in quizCourses
    await db.insert(quizCourses).values(
      validatedData.courseIds.map((courseId: string) => ({
        quizId: quizId,
        courseId,
        assignedBy: user.id,
        assignedAt: new Date(),
      }))
    );

    // Delete existing questions
    await db.delete(questions).where(eq(questions.quizId, quizId));

    // Create new questions
    const questionsToInsert = validatedData.questions.map((question) => ({
      quizId: quizId,
      type: question.type,
      question: question.question,
      options: question.type === 'MULTIPLE_CHOICE' ? question.options : null,
      correctAnswer: question.correctAnswer || null,
      points: question.points,
      order: question.order,
    }));

    await db.insert(questions).values(questionsToInsert);

    return NextResponse.json({
      success: true,
      quizId: updatedQuiz.id,
      message: 'Quiz updated successfully',
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update quiz',
    }, { status: 500 });
  }
} 