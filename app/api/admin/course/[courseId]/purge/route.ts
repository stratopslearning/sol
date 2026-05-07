/**
 * Hard delete (purge) of a course. CASCADE wipes the section tree and
 * everything under it (attempts, assignments, quiz_sections, etc.).
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { courses, users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const targetCourse = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });
    if (!targetCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    await db.delete(courses).where(eq(courses.id, courseId));

    const meta = extractRequestMeta(request);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.course.purge',
      targetType: 'course',
      targetId: courseId,
      metadata: { title: targetCourse.title, hard: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error purging course:', error);
    return NextResponse.json({ error: 'Failed to purge course' }, { status: 500 });
  }
}
