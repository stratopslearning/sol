import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { courses, sections, users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import { parseOptionalEndsAt } from '@/lib/sectionAvailability';
import { generateEnrollmentCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100, 'Section name too long'),
  courseId: z.string().min(1),
  endsAt: z.union([z.string(), z.null()]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || !user.platformStaff) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const validatedData = createSectionSchema.parse(body);
    const endsAtResult = parseOptionalEndsAt(validatedData.endsAt ?? null);
    if (!endsAtResult.ok) {
      return NextResponse.json({ error: endsAtResult.error }, { status: 400 });
    }
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, validatedData.courseId),
      columns: { workspaceId: true, tenantId: true },
    });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    const tenantId = course.tenantId ?? course.workspaceId;
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
      {
        action: 'support.tenant_access',
        targetType: 'course',
        targetId: validatedData.courseId,
      },
    );
    const professorEnrollmentCode = generateEnrollmentCode();
    const studentEnrollmentCode = generateEnrollmentCode();
    const [newSection] = await db.insert(sections).values({
      name: validatedData.name,
      courseId: validatedData.courseId,
      workspaceId: course.workspaceId,
      professorEnrollmentCode,
      studentEnrollmentCode,
      endsAt: endsAtResult.endsAt,
    }).returning();
    return NextResponse.json({ success: true, section: newSection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
