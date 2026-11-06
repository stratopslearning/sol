import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';
import { upsertLessonProgress } from '@/lib/learning';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  status: z.enum(['STARTED', 'COMPLETED']),
});

export async function POST(
  req: NextRequest,
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
      key: `student-lessons-write:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    const progress = await upsertLessonProgress(user.id, id, body.status);
    return NextResponse.json({ progress });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
