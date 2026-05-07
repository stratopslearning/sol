import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  questions,
  quizSections,
  quizzes,
  studentSections,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN';

    // Admins keep visibility into soft-deleted quizzes (for restore/audit).
    // Everyone else sees them as 404.
    const quiz = await db.query.quizzes.findFirst({
      where: isAdmin
        ? eq(quizzes.id, quizId)
        : and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const isOwnerProfessor =
      user.role === 'PROFESSOR' && quiz.professorId === user.id;

    // For students (and non-owner professors), enforce that the caller is
    // currently enrolled in at least one section the quiz is assigned to.
    if (!isAdmin && !isOwnerProfessor) {
      const quizSectionLinks = await db.query.quizSections.findMany({
        where: eq(quizSections.quizId, quizId),
      });
      const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
      if (quizSectionIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (user.role === 'STUDENT') {
        const enrollment = await db.query.studentSections.findFirst({
          where: and(
            eq(studentSections.studentId, user.id),
            eq(studentSections.status, 'ACTIVE'),
            inArray(studentSections.sectionId, quizSectionIds),
          ),
        });
        if (!enrollment) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else if (user.role === 'PROFESSOR') {
        // Co-teaching professor: require professor enrollment in one of the
        // sections the quiz is assigned to.
        const { professorSections } = await import('@/app/db/schema');
        const profEnrollment = await db.query.professorSections.findFirst({
          where: and(
            eq(professorSections.professorId, user.id),
            inArray(professorSections.sectionId, quizSectionIds),
          ),
        });
        if (!profEnrollment) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const quizQuestions = await db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
      orderBy: (questions, { asc }) => [asc(questions.order)],
    });

    // Strip the correct answer for callers who must not see it. Admins and the
    // quiz's own author keep the full row (used by the editor / reports).
    const includeAnswerKey = isAdmin || isOwnerProfessor;
    const responseQuestions = includeAnswerKey
      ? quizQuestions
      : quizQuestions.map((q) => ({
          ...q,
          correctAnswer: null,
        }));

    return NextResponse.json({ questions: responseQuestions });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
