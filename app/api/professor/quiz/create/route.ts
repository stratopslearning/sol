import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { professorSections, questions, quizSections, quizzes } from '@/app/db/schema';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sectionIds: z.array(z.string()).min(1, 'Select at least one section'),
  maxAttempts: z.number().min(1).max(10).default(1),
  timeLimit: z.number().min(1).optional(),
  passingScore: z.number().int().min(0).max(100).default(60),
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

    const newQuiz = await db.transaction(async (tx) => {
      const [created] = await tx.insert(quizzes).values({
        title: validatedData.title,
        description: validatedData.description,
        professorId: user.id,
        maxAttempts: validatedData.maxAttempts,
        timeLimit: validatedData.timeLimit,
        passingScore: validatedData.passingScore,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        isActive: true,
      }).returning();

      if (validatedData.questions.length > 0) {
        await tx.insert(questions).values(
          validatedData.questions.map((q) => ({
            quizId: created.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            order: q.order,
          })),
        );
      }

      await tx.insert(quizSections).values(
        validatedData.sectionIds.map((sectionId: string) => ({
          quizId: created.id,
          sectionId,
          assignedBy: user.id,
        })),
      );

      return created;
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
        sectionIds: validatedData.sectionIds,
      },
    });

  } catch (error) {
    console.error('Quiz creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
} 