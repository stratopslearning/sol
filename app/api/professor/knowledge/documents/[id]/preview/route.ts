import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { getKnowledgePreviewMeta } from '@/lib/knowledge/preview';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const courseId = req.nextUrl.searchParams.get('courseId');
    const preview = await getKnowledgePreviewMeta(
      auth.user,
      id,
      courseId,
    );
    return NextResponse.json({ preview });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
