import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

const updateSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100, 'Section name too long'),
});

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    // Extract sectionId from the URL
    const urlParts = req.nextUrl.pathname.split('/');
    const sectionId = urlParts[urlParts.length - 2];
    const body = await req.json();
    const validatedData = updateSectionSchema.parse(body);
    const [updatedSection] = await db.update(sections)
      .set({ name: validatedData.name })
      .where(eq(sections.id, sectionId))
      .returning();
    return NextResponse.json({ success: true, section: updatedSection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const { sectionId } = await params;
    await db.delete(sections).where(eq(sections.id, sectionId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
} 