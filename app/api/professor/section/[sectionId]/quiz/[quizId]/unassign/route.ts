import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizSections, professorSections, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest, context: { params: Promise<{ sectionId: string, quizId: string }> }) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { sectionId, quizId } = await context.params;
  // Map Clerk userId to local user id
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }
  // Check if professor is enrolled in the section
  const enrollment = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.sectionId, sectionId),
      eq(professorSections.professorId, user.id)
    ),
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this section' }, { status: 403 });
  }
  // Delete the quiz-section assignment
  await db.delete(quizSections).where(
    and(
      eq(quizSections.sectionId, sectionId),
      eq(quizSections.quizId, quizId)
    )
  );
  return NextResponse.json({ success: true });
} 