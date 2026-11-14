import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { leaveSection } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await context.params;
    const { user } = await requireProfessorApi(req, {
      scope: 'sections:write',
    });

    const limited = await enforceRateLimit({
      key: `professor-leave:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many leave requests. Please wait a moment.',
    });
    if (limited) return limited;

    await leaveSection(user, sectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
