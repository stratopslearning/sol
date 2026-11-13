import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { resolveRegradeRequestForProfessor } from '@/lib/regradeRequests';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'grades:write' });

    const limited = await enforceRateLimit({
      key: `professor-regrade-resolve:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { requestId } = await context.params;
    const updated = await resolveRegradeRequestForProfessor({
      requestId,
      professorId: auth.user.id,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: auth.user.id,
      actorClerkId: auth.user.clerkId,
      action: 'education.regrade.resolve',
      targetType: 'regrade_request',
      targetId: requestId,
      metadata: { attemptId: updated.attemptId },
      ...meta,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
