import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, questions, quizSections, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      maxAttempts,
      timeLimit,
      startDate,
      endDate,
      isActive,
      questions: quizQuestions,
      sectionIds = []
    } = body;

    if (!sectionIds || sectionIds.length === 0) {
      return NextResponse.json({ error: 'At least one section must be assigned to the quiz.' }, { status: 400 });
    }

    // Update quiz
    await db.update(quizzes)
      .set({
        title,
        description,
        maxAttempts,
        timeLimit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    // Delete existing questions
    await db.delete(questions).where(eq(questions.quizId, quizId));

    // Insert new questions
    if (quizQuestions && quizQuestions.length > 0) {
      const questionsToInsert = quizQuestions.map((q: any, index: number) => ({
        id: q.id.startsWith('temp-') ? undefined : q.id,
        quizId: quizId,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        order: index + 1,
      }));

      await db.insert(questions).values(questionsToInsert);
    }

    // Update quiz-section assignments
    await db.delete(quizSections).where(eq(quizSections.quizId, quizId));
    
    if (sectionIds && sectionIds.length > 0) {
      const quizSectionAssignments = sectionIds.map((sectionId: string) => ({
        quizId: quizId,
        sectionId,
        assignedBy: user.id,
      }));
      await db.insert(quizSections).values(quizSectionAssignments);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
} 