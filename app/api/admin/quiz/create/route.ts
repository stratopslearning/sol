import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, questions, quizSections, sections, users } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import { quizCreateBaseSchema } from '@/lib/quizSchemas';

export const dynamic = 'force-dynamic';

const createQuizSchema = quizCreateBaseSchema;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || !user.platformStaff) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const body = await readJsonBody(req);
    const validatedData = createQuizSchema.parse(body);

    if (!validatedData.sectionIds || validatedData.sectionIds.length === 0) {
      return NextResponse.json({ error: 'At least one section must be assigned to the quiz.' }, { status: 400 });
    }

    const assignedSections = await db.query.sections.findMany({
      where: inArray(sections.id, validatedData.sectionIds),
      columns: { id: true, tenantId: true, workspaceId: true },
    });
    if (assignedSections.length !== validatedData.sectionIds.length) {
      return NextResponse.json({ error: 'One or more sections not found' }, { status: 404 });
    }
    const tenantId =
      assignedSections[0]?.tenantId ?? assignedSections[0]?.workspaceId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: 'Section missing tenant' }, { status: 400 });
    }
    if (
      assignedSections.some(
        (s) => (s.tenantId ?? s.workspaceId) !== tenantId,
      )
    ) {
      return NextResponse.json(
        { error: 'All sections must belong to the same tenant' },
        { status: 400 },
      );
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      tenantId,
      { action: 'support.tenant_access', targetType: 'workspace', targetId: tenantId },
    );

    // Atomic creation: quiz + questions + section assignments.
    const newQuiz = await db.transaction(async (tx) => {
      const [created] = await tx.insert(quizzes).values({
        title: validatedData.title,
        description: validatedData.description,
        professorId: user.id,
        tenantId,
        maxAttempts: validatedData.maxAttempts,
        timeLimit: validatedData.timeLimit,
        passingScore: validatedData.passingScore,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
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
    return apiErrorResponse(error);
  }
} 