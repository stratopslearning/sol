import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta } from '@/lib/audit';
import {
  getCourseMaterial,
  softDeleteMaterial,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const material = await getCourseMaterial(auth.user, id);
    return NextResponse.json({ material });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-materials-write:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await ctx.params;
    const meta = extractRequestMeta(req);
    await softDeleteMaterial(auth.user, id, meta);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
