import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { courses, users } from '@/app/db/schema';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';

export const dynamic = 'force-dynamic';

const createCourseSchema = z.object({
  title: z.string().min(1, 'Course title is required').max(100, 'Course title too long'),
  description: z.string().optional(),
  workspaceId: z.string().uuid(),
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
    const validatedData = createCourseSchema.parse(body);
    const workspaceId = validatedData.workspaceId;
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      workspaceId,
      { action: 'support.tenant_access', targetType: 'workspace', targetId: workspaceId },
    );
    const [newCourse] = await db.insert(courses).values({
      workspaceId,
      tenantId: workspaceId,
      title: validatedData.title,
      description: validatedData.description || null,
      status: 'ACTIVE',
      isActive: true,
    }).returning();
    return NextResponse.json({ success: true, course: newCourse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
} 