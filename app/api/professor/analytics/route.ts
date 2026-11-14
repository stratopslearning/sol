import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getCourseAnalytics } from '@/lib/analytics';
import { listTeachableCourses } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  courseId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

/** List teachable courses, or course analytics when courseId is set. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const limited = await enforceRateLimit({
      key: `professor-analytics:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const parsed = querySchema.safeParse({
      courseId: req.nextUrl.searchParams.get('courseId') ?? undefined,
      sectionId: req.nextUrl.searchParams.get('sectionId') ?? undefined,
    });
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid query parameters');
    }

    if (!parsed.data.courseId) {
      const courses = await listTeachableCourses(auth.user);
      return NextResponse.json({ courses });
    }

    const analytics = await getCourseAnalytics(
      auth.user,
      parsed.data.courseId,
      { sectionId: parsed.data.sectionId },
    );
    return NextResponse.json({ analytics });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
