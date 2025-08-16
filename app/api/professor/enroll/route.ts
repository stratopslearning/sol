import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, professorSections } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentCode } = await req.json();
    if (!enrollmentCode) {
      return NextResponse.json({ error: 'Enrollment code is required' }, { status: 400 });
    }

    // Find section by professor enrollment code
    const section = await db.query.sections.findFirst({
      where: eq(sections.professorEnrollmentCode, enrollmentCode),
    });

    if (!section) {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, section.id),
        eq(professorSections.professorId, user.id)
      )
    });

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this section' }, { status: 400 });
    }

    // Enroll the professor
    await db.insert(professorSections).values({
      professorId: user.id,
      sectionId: section.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in section',
      section: {
        id: section.id,
        name: section.name,
        courseId: section.courseId
      }
    });
  } catch (error) {
    console.error('Professor enrollment error:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
} 