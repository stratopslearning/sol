import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { professorSections, questions, quizSections, quizzes } from '@/app/db/schema';
import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { quizCreateBaseSchema } from '@/lib/quizSchemas';

export const dynamic = 'force-dynamic';

const createQuizSchema = quizCreateBaseSchema;

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireProfessorApi(req, {
      scope: 'quizzes:write',
      professorOnly: true,
    });

    const limited = await enforceRateLimit({
      key: `quiz-create:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many quiz create requests. Please wait a moment.',
    });
    if (limited) return limited;

    const body = await readJsonBody(req);
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
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
} 