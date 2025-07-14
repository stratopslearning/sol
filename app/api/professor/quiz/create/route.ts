import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, sections, professorSections, users, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sectionIds: z.array(z.string()).min(1, 'Select at least one section'),
  maxAttempts: z.number().min(1).max(10).default(1),
  timeLimit: z.number().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  questions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    points: z.number().min(1).default(1),
    order: z.number().min(0),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createQuizSchema.parse(body);

    // Verify professor is enrolled in all specified sections
    const professorEnrollments = await db.query.professorSections.findMany({
      where: eq(professorSections.professorId, user.id),
    });

    const enrolledSectionIds = professorEnrollments.map(e => e.sectionId);
    const invalidSections = validatedData.sectionIds.filter(id => !enrolledSectionIds.includes(id));
    
    if (invalidSections.length > 0) {
      return NextResponse.json({ 
        error: 'You can only assign quizzes to sections you are enrolled in' 
      }, { status: 403 });
    }

    // Create the quiz
    const [newQuiz] = await db.insert(quizzes).values({
      title: validatedData.title,
      description: validatedData.description,
      professorId: user.id,
      maxAttempts: validatedData.maxAttempts,
      timeLimit: validatedData.timeLimit,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      isActive: true,
    }).returning();

    // Create questions
    if (validatedData.questions.length > 0) {
      await db.insert(questions).values(
        validatedData.questions.map(q => ({
          quizId: newQuiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        }))
      );
    }

    // Assign quiz to sections
    await db.insert(quizSections).values(
      validatedData.sectionIds.map((sectionId: string) => ({
        quizId: newQuiz.id,
        sectionId,
        assignedBy: user.id,
      }))
    );

    return NextResponse.json({ 
      success: true, 
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
        sectionIds: validatedData.sectionIds,
      }
    });

  } catch (error) {
    console.error('Quiz creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
} 