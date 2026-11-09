import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import { fetchCourseById } from '@/lib/db/entityScopedReads';
import { createSectionForCourse } from '@/lib/professor/createSection';

export const dynamic = 'force-dynamic';

const bulkSectionSchema = z.object({
  names: z.array(z.string().min(1).max(100)).min(1).max(50),
  courseId: z.string().min(1).max(100),
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
    const body = await readJsonBody(req);
    const validatedData = bulkSectionSchema.parse(body);
    const course = await fetchCourseById(validatedData.courseId);
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
    const newSections = [];
    for (const name of validatedData.names) {
      const section = await createSectionForCourse(user, {
        courseId: validatedData.courseId,
        name,
      });
      newSections.push(section);
    }
    return NextResponse.json({ success: true, sections: newSections });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
