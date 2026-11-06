import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getStudentLessonDetail } from '@/lib/learning';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      throw ApiError.unauthorized();
    }
    if (!(await userCanAccessLearningArea(user.id))) {
      throw ApiError.forbidden();
    }
    if (!isStudentEntitled(user)) {
      throw ApiError.paymentRequired();
    }

    const limited = await enforceRateLimit({
      key: `student-lessons:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const lesson = await getStudentLessonDetail(user.id, id);
    return NextResponse.json({ lesson });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
