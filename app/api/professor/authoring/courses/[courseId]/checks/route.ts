import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { runRolloverChecks } from '@/lib/authoring/rolloverChecks';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { courseId } = await ctx.params;
    const result = await runRolloverChecks(auth.user, courseId);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
