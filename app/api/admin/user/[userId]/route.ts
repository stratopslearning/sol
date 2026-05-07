import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await params;
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await db.query.users.findFirst({
      where: eq(users.clerkId, adminClerkId),
    });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }
    const validatedData = parsed.data;

    // Snapshot the prior state so the audit entry can record the diff.
    const before = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!before) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'admin.user.update',
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        before: { role: before.role },
        after: { role: updatedUser.role },
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
