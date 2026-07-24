import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await params;
    const user = await getOrCreateUser();

    if (!user || user.role !== 'STUDENT') {
      throw ApiError.unauthorized();
    }

    const limited = await enforceRateLimit({
      key: `student-leave:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many leave requests. Please wait a moment.',
    });
    if (limited) return limited;

    const enrollment = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.sectionId, sectionId),
        eq(studentSections.studentId, user.id),
      ),
    });

    if (!enrollment) {
      throw ApiError.notFound('Not enrolled in this section');
    }

    await db.delete(studentSections).where(
      and(
        eq(studentSections.sectionId, sectionId),
        eq(studentSections.studentId, user.id),
      ),
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully left section',
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
