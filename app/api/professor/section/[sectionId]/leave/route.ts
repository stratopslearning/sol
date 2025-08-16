import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { professorSections } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
import { users } from '@/app/db/schema';

export async function POST(req: NextRequest, context: { params: Promise<{ sectionId: string }> }) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { sectionId } = await context.params;
  // Map Clerk userId to local user id
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }
  // Check if enrolled
  const enrollment = await db.query.professorSections.findFirst({
    where: eq(professorSections.sectionId, sectionId),
  });
  console.log({ userId, localUserId: user.id, sectionId, enrollment });
  if (!enrollment || enrollment.professorId !== user.id) {
    return NextResponse.json({ error: 'Not enrolled in this section' }, { status: 400 });
  }
  // Remove enrollment
  await db.delete(professorSections).where(
    and(
      eq(professorSections.sectionId, sectionId),
      eq(professorSections.professorId, user.id)
    )
  );
  return NextResponse.json({ success: true });
} 