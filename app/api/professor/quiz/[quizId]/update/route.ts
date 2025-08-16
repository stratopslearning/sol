import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, sections, professorSections, users, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const updateQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sectionIds: z.array(z.string()).min(1, 'Select at least one section'),
  maxAttempts: z.number().min(1).max(10).default(1),
  timeLimit: z.number().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
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
    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const validatedData = updateQuizSchema.parse(body);

    // Check if quiz exists and belongs to professor
    const existingQuiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Verify the quiz belongs to the professor by section assignment
    const quizSectionAssignments = await db.query.quizSections.findMany({ where: eq(quizSections.quizId, quizId) });
    const professorSectionEnrollments = await db.query.professorSections.findMany({ where: eq(professorSections.professorId, user.id) });
    const allowedSectionIds = professorSectionEnrollments.map(e => e.sectionId);
    const isAllowed = quizSectionAssignments.some(qs => allowedSectionIds.includes(qs.sectionId));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify professor is enrolled in all specified sections
    const enrolledSectionIds = professorSectionEnrollments.map(e => e.sectionId);
    const invalidSections = validatedData.sectionIds.filter(id => !enrolledSectionIds.includes(id));
    
    if (invalidSections.length > 0) {
      return NextResponse.json({ 
        error: 'You can only assign quizzes to sections you are enrolled in' 
      }, { status: 403 });
    }

    // Update the quiz
    await db.update(quizzes)
      .set({
        title: validatedData.title,
        description: validatedData.description,
        maxAttempts: validatedData.maxAttempts,
        timeLimit: validatedData.timeLimit,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    // Delete existing questions and recreate them
    await db.delete(questions).where(eq(questions.quizId, quizId));

    // Create new questions
    if (validatedData.questions.length > 0) {
      await db.insert(questions).values(
        validatedData.questions.map(q => ({
          quizId,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        }))
      );
    }

    // Update section assignments
    await db.delete(quizSections).where(eq(quizSections.quizId, quizId));
    await db.insert(quizSections).values(
      validatedData.sectionIds.map((sectionId: string) => ({
        quizId,
        sectionId,
        assignedBy: user.id,
      }))
    );

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