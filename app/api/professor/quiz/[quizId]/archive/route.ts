import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { quizzes, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the quiz belongs to the professor
    const existingQuiz = await db.query.quizzes.findFirst({
      where: and(
        eq(quizzes.id, quizId),
        eq(quizzes.professorId, user.id)
      ),
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Archive the quiz (set to inactive)
    const [archivedQuiz] = await db.update(quizzes)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    return NextResponse.json({
      success: true,
      quizId: archivedQuiz.id,
      message: 'Quiz archived successfully',
    });

  } catch (error) {
    console.error('Error archiving quiz:', error);
    return NextResponse.json({
      error: 'Failed to archive quiz',
    }, { status: 500 });
  }
} 