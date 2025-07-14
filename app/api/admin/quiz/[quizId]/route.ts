import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, questions, quizSections, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
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

    // Delete quiz-section assignments
    await db.delete(quizSections).where(eq(quizSections.quizId, quizId));
    
    // Delete questions
    await db.delete(questions).where(eq(questions.quizId, quizId));
    
    // Delete quiz
    await db.delete(quizzes).where(eq(quizzes.id, quizId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
} 