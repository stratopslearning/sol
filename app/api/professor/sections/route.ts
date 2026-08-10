import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { listProfessorSections } from '@/lib/professor/sections';

export const dynamic = 'force-dynamic';

/** Sections the caller teaches, split into active and archived (concluded). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });

    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const sections = await listProfessorSections(auth.user);
    return NextResponse.json(sections);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
