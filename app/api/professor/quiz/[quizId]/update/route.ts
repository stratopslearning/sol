import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  professorSections,
  questions,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const updateQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sectionIds: z.array(z.string()).min(1, 'Select at least one section'),
  maxAttempts: z.number().min(1).max(10).default(1),
  timeLimit: z.number().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  passingScore: z.number().int().min(0).max(100).default(60),
  questions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    points: z.number().min(1).default(1),
    order: z.number().min(0),
  })),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const validatedData = updateQuizSchema.parse(body);

    // Check if quiz exists and belongs to professor. Soft-deleted quizzes
    // can't be edited.
    const existingQuiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Quiz mutations require *ownership*. The previous logic let any professor
    // co-teaching one of the quiz's assigned sections mutate the quiz, which
    // included rewriting questions, answers, and reassigning sections.
    const isAdmin = user.role === 'ADMIN';
    const isOwner = existingQuiz.professorId === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify professor is enrolled in all specified sections (so they can't
    // assign their quiz to a section they don't teach). Admins are exempt.
    const professorSectionEnrollments = await db.query.professorSections.findMany({
      where: eq(professorSections.professorId, user.id),
    });
    const enrolledSectionIds = professorSectionEnrollments.map((e) => e.sectionId);
    if (!isAdmin) {
      const invalidSections = validatedData.sectionIds.filter(
        (id) => !enrolledSectionIds.includes(id),
      );
      if (invalidSections.length > 0) {
        return NextResponse.json(
          { error: 'You can only assign quizzes to sections you are enrolled in' },
          { status: 403 },
        );
      }
    }

    // Validate date/time: end date must be after start date, or same day with end time after start time
    if (validatedData.startDate && validatedData.endDate) {
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid date format' 
        }, { status: 400 });
      }

      // Check if end date is before start date
      if (endDate < startDate) {
        return NextResponse.json({ 
          error: 'End date and time must be after start date and time' 
        }, { status: 400 });
      }

      // If same day, end time must be after start time (already handled by date comparison if times are included)
      // The dates include time, so this check is sufficient
      if (endDate <= startDate) {
        return NextResponse.json({ 
          error: 'End date and time must be after start date and time' 
        }, { status: 400 });
      }
    }

    // Atomic edit: quiz row + questions + section assignments all in one
    // transaction so a partial failure cannot leave the quiz with mismatched
    // questions or stale section assignments.
    await db.transaction(async (tx) => {
      await tx
        .update(quizzes)
        .set({
          title: validatedData.title,
          description: validatedData.description,
          maxAttempts: validatedData.maxAttempts,
          timeLimit: validatedData.timeLimit,
          passingScore: validatedData.passingScore,
          startDate: validatedData.startDate
            ? new Date(validatedData.startDate)
            : null,
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
          isActive: validatedData.isActive,
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, quizId));

      await tx.delete(questions).where(eq(questions.quizId, quizId));
      if (validatedData.questions.length > 0) {
        await tx.insert(questions).values(
          validatedData.questions.map((q) => ({
            quizId,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            order: q.order,
          })),
        );
      }

      await tx.delete(quizSections).where(eq(quizSections.quizId, quizId));
      await tx.insert(quizSections).values(
        validatedData.sectionIds.map((sectionId: string) => ({
          quizId,
          sectionId,
          assignedBy: user.id,
        })),
      );
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz updated successfully',
      quiz: {
        id: quizId,
        title: validatedData.title,
        sectionIds: validatedData.sectionIds,
      }
    });

  } catch (error) {
    console.error('Quiz update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
} 