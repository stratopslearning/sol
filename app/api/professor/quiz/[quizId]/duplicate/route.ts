import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { questions, quizSections, quizzes } from '@/app/db/schema';
import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { adminSupportForTenant } from '@/lib/professor/adminSupport';
import { authorizeOnSection } from '@/lib/authz/courseAccess';
import { activeOnly } from '@/lib/db/filters';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { professorCanAccessQuiz } from '@/lib/quizAccess';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(req, { scope: 'quizzes:write' });

    const limited = await enforceRateLimit({
      key: `quiz-dup:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many duplicate requests. Please wait a moment.',
    });
    if (limited) return limited;

    const originalQuiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
      with: {
        questions: true,
        sectionAssignments: true,
      },
    });

    if (!originalQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (!(await professorCanAccessQuiz(user, quizId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const adminSupport = await adminSupportForTenant(
      user,
      originalQuiz.tenantId,
    );
    const authorId = originalQuiz.professorId;
    const isAuthor = Boolean(authorId && authorId === user.id);

    let sectionsToCopy = originalQuiz.sectionAssignments;
    if (!adminSupport && !isAuthor) {
      const writable: typeof originalQuiz.sectionAssignments = [];
      for (const sa of originalQuiz.sectionAssignments) {
        if (await authorizeOnSection(user, 'content.write', sa.sectionId)) {
          writable.push(sa);
        }
      }
      sectionsToCopy = writable;
    }

    const newQuiz = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quizzes)
        .values({
          title: `${originalQuiz.title} (Copy)`,
          description: originalQuiz.description,
          professorId: user.id,
          maxAttempts: originalQuiz.maxAttempts,
          timeLimit: originalQuiz.timeLimit,
          passingScore: originalQuiz.passingScore,
          startDate: originalQuiz.startDate,
          endDate: originalQuiz.endDate,
          isActive: false,
        })
        .returning();

      if (originalQuiz.questions.length > 0) {
        await tx.insert(questions).values(
          originalQuiz.questions.map((q) => ({
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

      if (sectionsToCopy.length > 0) {
        await tx.insert(quizSections).values(
          sectionsToCopy.map((sa) => ({
            quizId: created.id,
            sectionId: sa.sectionId,
            assignedBy: user.id,
          })),
        );
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
      },
    });
  } catch (error) {
    console.error('Quiz duplication error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json({ error: 'Failed to duplicate quiz' }, { status: 500 });
  }
}
