import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, studentSections, courses } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentCode } = await req.json();
    if (!enrollmentCode) {
      return NextResponse.json({ error: 'Enrollment code is required' }, { status: 400 });
    }

    // Find section by student enrollment code
    const section = await db.query.sections.findFirst({
      where: eq(sections.studentEnrollmentCode, enrollmentCode),
    });

    if (!section) {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 404 });
    }

    // Check if already enrolled in this specific section
    const existing = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.sectionId, section.id),
        eq(studentSections.studentId, user.id)
      )
    });

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this section' }, { status: 400 });
    }

    // Check if already enrolled in another section from the same course
    const existingCourseEnrollment = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, user.id),
        eq(studentSections.status, 'ACTIVE')
      ),
      with: {
        section: true
      }
    });

    if (existingCourseEnrollment && existingCourseEnrollment.section.courseId === section.courseId) {
      return NextResponse.json({ 
        error: 'You are already enrolled in a section from this course. You cannot enroll in multiple sections from the same course.' 
      }, { status: 400 });
    }

    // Enroll the student
    await db.insert(studentSections).values({
      studentId: user.id,
      sectionId: section.id,
    });

    // Get course info for the section
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, section.courseId)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully enrolled in section',
      section: {
        id: section.id,
        name: section.name,
        course: course ? {
          id: course.id,
          title: course.title
        } : null
      }
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
} 