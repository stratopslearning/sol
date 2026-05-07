import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100, 'Section name too long'),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await params;
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
    const body = await req.json();
    const validatedData = updateSectionSchema.parse(body);
    const [updatedSection] = await db
      .update(sections)
      .set({ name: validatedData.name })
      .where(eq(sections.id, sectionId))
      .returning();
    return NextResponse.json({ success: true, section: updatedSection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  try {
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
    const { sectionId } = await params;

    const targetSection = await db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });
    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    if (targetSection.deletedAt) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Soft delete: keep the row + dependents so admins can audit/restore.
    // Hard delete with full cascade is at /api/admin/section/[id]/purge.
    await db
      .update(sections)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(sections.id, sectionId));

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.section.delete',
      targetType: 'section',
      targetId: sectionId,
      metadata: { name: targetSection?.name ?? null, soft: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
