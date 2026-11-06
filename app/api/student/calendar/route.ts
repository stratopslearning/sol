import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { isStudentEntitled } from '@/lib/featureFlags';
import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { listStudentQuizDueEvents } from '@/lib/student/quizCalendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
      key: `student-calendar:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    void req;
    const events = await listStudentQuizDueEvents(user.id);
    return NextResponse.json({ events });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
