import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { questions, quizSections, quizzes, users } from '@/app/db/schema';

export const dynamic = 'force-dynamic';

const isoDateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: 'Invalid date string',
  });

const adminQuizUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4_000).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(20),
  timeLimit: z.number().int().min(1).max(24 * 60).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).default(60),
  startDate: isoDateString.optional().nullable(),
  endDate: isoDateString.optional().nullable(),
  isActive: z.boolean().default(true),
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
        question: z.string().min(1).max(4_000),
        options: z.array(z.string().max(2_000)).optional().nullable(),
        correctAnswer: z.string().max(2_000).optional().nullable(),
        points: z.number().int().min(1).max(100).default(1),
      }),
    )
    .default([]),
  sectionIds: z
    .array(z.string().uuid())
    .min(1, 'At least one section must be assigned to the quiz.'),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = adminQuizUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }
    const data = parsed.data;

    await db.transaction(async (tx) => {
      await tx
        .update(quizzes)
        .set({
          title: data.title,
          description: data.description ?? null,
          maxAttempts: data.maxAttempts,
          timeLimit: data.timeLimit ?? null,
          passingScore: data.passingScore,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          isActive: data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, quizId));

      await tx.delete(questions).where(eq(questions.quizId, quizId));

      if (data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q, index) => ({
          quizId,
          type: q.type,
          question: q.question,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          points: q.points,
          order: index + 1,
        }));
        await tx.insert(questions).values(questionsToInsert);
      }

      await tx.delete(quizSections).where(eq(quizSections.quizId, quizId));
      await tx.insert(quizSections).values(
        data.sectionIds.map((sectionId) => ({
          quizId,
          sectionId,
          assignedBy: user.id,
        })),
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}
