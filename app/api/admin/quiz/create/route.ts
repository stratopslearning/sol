import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, questions, quizSections, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const validatedData = createQuizSchema.parse(body);

    if (!validatedData.sectionIds || validatedData.sectionIds.length === 0) {
      return NextResponse.json({ error: 'At least one section must be assigned to the quiz.' }, { status: 400 });
    }

    // Atomic creation: quiz + questions + section assignments.
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
    console.error('Admin quiz creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
} 