import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, questions, courses, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const createQuizSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  courseId: z.string().optional(), // Can be "global" or course ID
  maxAttempts: z.number().min(1).max(10),
  timeLimit: z.number().min(1).max(180),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  questions: z.array(z.object({
    question: z.string().min(1),
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
    points: z.number().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
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

export async function POST(req: NextRequest) {
  try {
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

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createQuizSchema.parse(body);

    // Verify the course belongs to the professor (if course is specified)
    if (validatedData.courseId && validatedData.courseId !== 'global') {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, validatedData.courseId),
      });

      if (!course || course.professorId !== user.id) {
        return NextResponse.json({ error: 'Course not found or access denied' }, { status: 403 });
      }
    }

    const courseId = validatedData.courseId === 'global' ? null : validatedData.courseId;

    // Create the quiz
    const [quiz] = await db.insert(quizzes).values({
      title: validatedData.title,
      description: validatedData.description || null,
      courseId: courseId,
      professorId: user.id,
      maxAttempts: validatedData.maxAttempts,
      timeLimit: validatedData.timeLimit,
      startDate: validatedData.startDate || null,
      endDate: validatedData.endDate || null,
      isActive: true,
    }).returning();

    // Create questions
    const questionsToInsert = validatedData.questions.map((question, index) => ({
      quizId: quiz.id,
      type: question.type,
      question: question.question,
      options: question.type === 'MULTIPLE_CHOICE' ? question.options : null,
      correctAnswer: question.correctAnswer || null,
      points: question.points,
      order: index + 1,
    }));

    await db.insert(questions).values(questionsToInsert);

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      message: 'Quiz created successfully',
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create quiz',
    }, { status: 500 });
  }
} 