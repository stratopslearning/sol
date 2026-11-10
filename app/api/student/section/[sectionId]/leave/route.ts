import { NextRequest, NextResponse } from 'next/server';

import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

/**
 * Student self-leave is disabled. Instructors drop learners from the roster.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  try {
    await params;
    const user = await getOrCreateUser();

    if (!user) {
      throw ApiError.unauthorized();
    }
    if (!(await userCanAccessLearningArea(user.id))) {
      throw ApiError.forbidden();
    }

    throw ApiError.forbidden(
      'You cannot leave this section yourself. Contact your instructor if you need to be removed.',
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
