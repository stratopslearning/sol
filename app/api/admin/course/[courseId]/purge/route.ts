/**
 * Hard delete (purge) of a course. CASCADE wipes the section tree and
 * everything under it (attempts, assignments, quiz_sections, etc.).
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import {
  adminFetchCourseDefiner,
  adminPurgeCourseDefiner,
} from '@/lib/db/tenantWriteDefiners';

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
    if (!user || !user.platformStaff) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const targetCourse = await adminFetchCourseDefiner(courseId);
    if (!targetCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    const tenantId =
      (targetCourse.tenant_id as string | null) ??
      (targetCourse.workspace_id as string | null);
    if (!tenantId) {
      return NextResponse.json({ error: 'Course missing tenant' }, { status: 400 });
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      tenantId,
      { action: 'support.tenant_access', targetType: 'course', targetId: courseId },
    );

    await adminPurgeCourseDefiner(courseId);

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
    return apiErrorResponse(error);
  }
}
