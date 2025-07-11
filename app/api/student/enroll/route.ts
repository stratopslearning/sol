import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { courses, courseEnrollments } from '@/app/db/schema';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
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
    // Find course by code
    const course = await db.query.courses.findFirst({
      where: eq(courses.enrollmentCode, enrollmentCode),
    });
    if (!course) {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 404 });
    }
    // Check if already enrolled
    const existing = await db.query.courseEnrollments.findFirst({
      where: and(
        eq(courseEnrollments.courseId, course.id),
        eq(courseEnrollments.studentId, user.id)
      ),
    });
    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 409 });
    }
    // Create enrollment
    await db.insert(courseEnrollments).values({
      courseId: course.id,
      studentId: user.id,
      enrolledAt: new Date(),
    });
    return NextResponse.json({ success: true, course: { id: course.id, title: course.title } });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 