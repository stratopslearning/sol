import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import { dropStudentFromSection } from '@/lib/professor/roster';

export const dynamic = 'force-dynamic';

/** Soft-remove a learner from the section roster. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ sectionId: string; enrollmentId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'sections:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-sections-write:${auth.user.id}`,
      limit: 40,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { sectionId, enrollmentId } = await ctx.params;
    const meta = extractRequestMeta(req);
    await dropStudentFromSection(
      auth.user,
      { sectionId, enrollmentId },
      meta,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
