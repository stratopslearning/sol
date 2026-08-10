import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { courses, sections, studentSections } from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { activeOnly } from '@/lib/db/filters';
import { paymentsEnabled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isSectionConcluded } from '@/lib/sectionAvailability';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Brute-force enrollment-code attempts (e.g. trying to guess a valid
    // section code) are throttled per user.
    const limited = await enforceRateLimit({
      key: `enroll-student:${user.id}`,
      limit: 10,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many enrollment attempts. Please wait a moment.',
    });
    if (limited) return limited;

    // Match the same paywall the dashboard middleware applies to student RSCs:
    // unpaid students should be redirected to /payment, not silently allowed
    // to enroll in sections they can never use.
    //
    // Skipped entirely when the payments feature flag is off.
    if (paymentsEnabled() && !user.paid) {
      return NextResponse.json(
        {
          error: 'Payment required before enrolling in sections.',
          paymentRequired: true,
        },
        { status: 402 },
      );
    }

    const { enrollmentCode } = await req.json();
    if (!enrollmentCode || typeof enrollmentCode !== 'string') {
      return NextResponse.json(
        { error: 'Enrollment code is required' },
        { status: 400 },
      );
    }

    const section = await db.query.sections.findFirst({
      where: and(
        eq(sections.studentEnrollmentCode, enrollmentCode),
        activeOnly(sections.deletedAt),
      ),
    });

    if (!section) {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 404 });
    }

    // Refuse to enroll into archived / concluded sections.
    if (!section.isActive) {
      return NextResponse.json({ error: 'This section is no longer active.' }, { status: 400 });
    }
    if (isSectionConcluded(section)) {
      return NextResponse.json(
        { error: 'This section has ended. Enrollment is closed.' },
        { status: 400 },
      );
    }

    // Already enrolled in this exact section?
    const existing = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.sectionId, section.id),
        eq(studentSections.studentId, user.id),
      ),
    });

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this section' }, { status: 400 });
    }

    // Already enrolled in another active (non-concluded) section in the same course?
    const existingCourseEnrollments = await db.query.studentSections.findMany({
      where: and(
        eq(studentSections.studentId, user.id),
        eq(studentSections.status, 'ACTIVE'),
      ),
      with: {
        section: true,
      },
    });

    const conflictingEnrollment = existingCourseEnrollments.find(
      (e) =>
        e.section.courseId === section.courseId &&
        !isSectionConcluded(e.section),
    );

    if (conflictingEnrollment) {
      return NextResponse.json(
        {
          error:
            'You are already enrolled in a section from this course. You cannot enroll in multiple sections from the same course.',
        },
        { status: 400 },
      );
    }

    await db.insert(studentSections).values({
      studentId: user.id,
      sectionId: section.id,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'education.enrollment.join',
      targetType: 'section',
      targetId: section.id,
      metadata: { courseId: section.courseId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, section.courseId),
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in section',
      section: {
        id: section.id,
        name: section.name,
        course: course
          ? {
              id: course.id,
              title: course.title,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}
