import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const user = await getOrCreateUser();
    
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if student is enrolled in this section
    const enrollment = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.sectionId, sectionId),
        eq(studentSections.studentId, user.id)
      )
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this section' }, { status: 404 });
    }

    // Remove the enrollment
    await db.delete(studentSections).where(
      and(
        eq(studentSections.sectionId, sectionId),
        eq(studentSections.studentId, user.id)
      )
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully left section'
    });

  } catch (error) {
    console.error('Leave section error:', error);
    return NextResponse.json({ error: 'Failed to leave section' }, { status: 500 });
  }
} 