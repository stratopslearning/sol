/**
 * Hard delete (purge) of a course material: chunks + S3 object + row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { courseMaterials, courses, users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import { purgeMaterial } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const material = await db.query.courseMaterials.findFirst({
      where: eq(courseMaterials.id, id),
      columns: { tenantId: true, courseId: true },
    });
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }
    let tenantId = material.tenantId;
    if (!tenantId) {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, material.courseId),
        columns: { tenantId: true, workspaceId: true },
      });
      tenantId = course?.tenantId ?? course?.workspaceId ?? null;
    }
    if (!tenantId) {
      return NextResponse.json({ error: 'Material missing tenant' }, { status: 400 });
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      tenantId,
      { action: 'support.tenant_access', targetType: 'course_material', targetId: id },
    );

    const purged = await purgeMaterial(id);
    const meta = extractRequestMeta(request);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.material.purge',
      targetType: 'course_material',
      targetId: id,
      metadata: {
        title: purged.title,
        courseId: purged.courseId,
        s3Key: purged.s3Key,
        hard: true,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error purging material:', error);
    return apiErrorResponse(error);
  }
}
