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
import { isStudentEntitled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { professorCanAccessQuiz, userCanWriteQuiz } from '@/lib/quizAccess';

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
    if (!isStudentEntitled(user)) {
      return NextResponse.json({ error: 'Payment required' }, { status: 402 });
    }

    // Soft-deleted quizzes are 404 for everyone here (restore/audit tooling
    // lives on the admin surfaces, which require a support grant).
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Staff access is binding-based (role bindings / support grant).
    const isStaff = await professorCanAccessQuiz(user, quizId);

    // Everyone else must be actively enrolled in a section the quiz is assigned to.
    if (!isStaff) {
      const quizSectionLinks = await db.query.quizSections.findMany({
        where: eq(quizSections.quizId, quizId),
      });
      const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
      if (quizSectionIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

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
    }

    const quizQuestions = await db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
      orderBy: (questions, { asc }) => [asc(questions.order)],
    });

    // Strip answer key + rubric unless the caller may WRITE this quiz
    // (content.write binding) — read-only staff and students never see the key.
    const includeAnswerKey = isStaff && (await userCanWriteQuiz(user, quizId));
    const responseQuestions = includeAnswerKey
      ? quizQuestions
      : quizQuestions.map((q) => ({
          ...q,
          correctAnswer: null,
          rubric: null,
          rubricVersion: null,
        }));

    return NextResponse.json({ questions: responseQuestions });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
