import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  professorSections,
  questions,
  quizSections,
  quizzes,
  studentSections,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const user = await getOrCreateUser();

    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (originalQuiz.professorId === user.id) {
      return NextResponse.json(
        {
          error: 'Quiz is already editable',
          quiz: { id: originalQuiz.id, title: originalQuiz.title },
        },
        { status: 409 },
      );
    }

    const sectionsToMove =
      user.role === 'ADMIN'
        ? originalQuiz.sectionAssignments
        : await resolveProfessorSectionsToMove(
            user.id,
            originalQuiz.sectionAssignments,
          );

    if (sectionsToMove.length === 0) {
      return NextResponse.json(
        { error: 'No editable section assignments found for this quiz' },
        { status: 403 },
      );
    }

    const sectionIdsToMove = sectionsToMove.map(
      (assignment) => assignment.sectionId,
    );

    const copiedQuiz = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quizzes)
        .values({
          title: originalQuiz.title,
          description: originalQuiz.description,
          professorId: user.id,
          maxAttempts: originalQuiz.maxAttempts,
          timeLimit: originalQuiz.timeLimit,
          passingScore: originalQuiz.passingScore,
          startDate: originalQuiz.startDate,
          endDate: originalQuiz.endDate,
          isActive: originalQuiz.isActive,
        })
        .returning();

      if (originalQuiz.questions.length > 0) {
        await tx.insert(questions).values(
          originalQuiz.questions.map((question) => ({
            quizId: created.id,
            type: question.type,
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            points: question.points,
            order: question.order,
          })),
        );
      }

      await tx.insert(quizSections).values(
        sectionsToMove.map((assignment) => ({
          quizId: created.id,
          sectionId: assignment.sectionId,
          assignedBy: user.id,
        })),
      );

      await tx
        .update(attempts)
        .set({ quizId: created.id })
        .where(
          and(
            eq(attempts.quizId, originalQuiz.id),
            inArray(attempts.sectionId, sectionIdsToMove),
          ),
        );

      const enrolledStudents = await tx.query.studentSections.findMany({
        where: and(
          inArray(studentSections.sectionId, sectionIdsToMove),
          eq(studentSections.status, 'ACTIVE'),
        ),
        columns: { studentId: true },
      });
      const enrolledStudentIds = [
        ...new Set(enrolledStudents.map((e) => e.studentId)),
      ];

      if (enrolledStudentIds.length > 0) {
        await tx
          .update(assignments)
          .set({ quizId: created.id })
          .where(
            and(
              eq(assignments.quizId, originalQuiz.id),
              inArray(assignments.studentId, enrolledStudentIds),
            ),
          );
      }

      await tx
        .delete(quizSections)
        .where(
          and(
            eq(quizSections.quizId, originalQuiz.id),
            inArray(quizSections.sectionId, sectionIdsToMove),
          ),
        );

      return created;
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: copiedQuiz.id,
        title: copiedQuiz.title,
        sectionIds: sectionIdsToMove,
      },
    });
  } catch (error) {
    console.error('Quiz section-copy error:', error);
    return NextResponse.json(
      { error: 'Failed to create editable quiz copy' },
      { status: 500 },
    );
  }
}

async function resolveProfessorSectionsToMove(
  professorId: string,
  assignments: { sectionId: string }[],
) {
  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, professorId),
  });
  const enrolledSectionIds = new Set(
    enrollments.map((enrollment) => enrollment.sectionId),
  );
  return assignments.filter((assignment) =>
    enrolledSectionIds.has(assignment.sectionId),
  );
}
