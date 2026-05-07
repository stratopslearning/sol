import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { professorSections, users } from '@/app/db/schema';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { sectionId } = await context.params;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  // Only allow professors (or admins) to use this endpoint.
  if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Look up the *caller's* enrollment in this section. The previous version
  // searched for any professor enrolled in the section and then compared the
  // first match to the caller — which silently returned 400 when multiple
  // professors co-taught the section, even though the caller was enrolled.
  const enrollment = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.sectionId, sectionId),
      eq(professorSections.professorId, user.id),
    ),
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this section' }, { status: 400 });
  }

  await db
    .delete(professorSections)
    .where(
      and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, user.id),
      ),
    );

  return NextResponse.json({ success: true });
}
