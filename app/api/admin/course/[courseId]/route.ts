import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { courses, users } from '@/app/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const { courseId } = await params;
    await db.delete(courses).where(eq(courses.id, courseId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
} 