import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { professorSections, questions, quizSections, quizzes } from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the original quiz with questions and section assignments. Cannot
    // duplicate a soft-deleted quiz.
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

    // Duplicating creates a new quiz owned by the caller, so we require either
    // ownership of the original or that the caller co-teaches at least one of
    // the original's sections (so they have legitimate access to its content).
    // Admins always pass.
    const isAdmin = user.role === 'ADMIN';
    const isOwner = originalQuiz.professorId === user.id;
    if (!isAdmin && !isOwner) {
      const professorSectionEnrollments = await db.query.professorSections.findMany({
        where: eq(professorSections.professorId, user.id),
      });
      const allowedSectionIds = professorSectionEnrollments.map((e) => e.sectionId);
      const isCoTeacher = originalQuiz.sectionAssignments.some((qs) =>
        allowedSectionIds.includes(qs.sectionId),
      );
      if (!isCoTeacher) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Resolve which section assignments to copy *before* the transaction so we
    // can fail fast on permission errors.
    let sectionsToCopy = originalQuiz.sectionAssignments;
    if (!isAdmin && !isOwner) {
      const myEnrollments = await db.query.professorSections.findMany({
        where: eq(professorSections.professorId, user.id),
      });
      const mySectionIds = new Set(myEnrollments.map((e) => e.sectionId));
      sectionsToCopy = originalQuiz.sectionAssignments.filter((sa) =>
        mySectionIds.has(sa.sectionId),
      );
    }

    // Atomic clone: new quiz row + questions + section assignments.
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
    return NextResponse.json({ error: 'Failed to duplicate quiz' }, { status: 500 });
  }
} 