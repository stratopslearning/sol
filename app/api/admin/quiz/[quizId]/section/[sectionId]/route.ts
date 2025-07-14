import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizSections, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; sectionId: string }> }
) {
  try {
    const { quizId, sectionId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check if user is admin
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    // Delete the quiz-section assignment
    await db.delete(quizSections).where(and(eq(quizSections.quizId, quizId), eq(quizSections.sectionId, sectionId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unassigning quiz from section:', error);
    return NextResponse.json({ error: 'Failed to unassign quiz from section' }, { status: 500 });
  }
} 