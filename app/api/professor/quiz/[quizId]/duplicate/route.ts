import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, quizSections, professorSections } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract quizId from the URL
    const urlParts = req.nextUrl.pathname.split('/');
    const quizId = urlParts[urlParts.length - 2];

    // Verify the quiz belongs to the professor by section assignment
    const quizSectionAssignments = await db.query.quizSections.findMany({ where: eq(quizSections.quizId, quizId) });
    const professorSectionEnrollments = await db.query.professorSections.findMany({ where: eq(professorSections.professorId, user.id) });
    const allowedSectionIds = professorSectionEnrollments.map(e => e.sectionId);
    const isAllowed = quizSectionAssignments.some(qs => allowedSectionIds.includes(qs.sectionId));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the original quiz with questions and section assignments
    const originalQuiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
      with: {
        questions: true,
        sectionAssignments: true,
      }
    });

    if (!originalQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Create a new quiz with the same data
    const [newQuiz] = await db.insert(quizzes).values({
      title: `${originalQuiz.title} (Copy)`,
      description: originalQuiz.description,
      professorId: user.id,
      maxAttempts: originalQuiz.maxAttempts,
      timeLimit: originalQuiz.timeLimit,
      startDate: originalQuiz.startDate,
      endDate: originalQuiz.endDate,
      isActive: false, // Start as inactive
    }).returning();

    // Copy questions
    if (originalQuiz.questions.length > 0) {
      await db.insert(questions).values(
        originalQuiz.questions.map(q => ({
          quizId: newQuiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        }))
      );
    }

    // Copy section assignments
    if (originalQuiz.sectionAssignments.length > 0) {
      await db.insert(quizSections).values(
        originalQuiz.sectionAssignments.map(sa => ({
          quizId: newQuiz.id,
          sectionId: sa.sectionId,
          assignedBy: user.id,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
      }
    });

  } catch (error) {
    console.error('Quiz duplication error:', error);
    return NextResponse.json({ error: 'Failed to duplicate quiz' }, { status: 500 });
  }
} 