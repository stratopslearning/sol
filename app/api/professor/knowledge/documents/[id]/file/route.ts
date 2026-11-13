import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { getKnowledgePreviewBytes } from '@/lib/knowledge/preview';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const courseId = req.nextUrl.searchParams.get('courseId');
    const disposition =
      req.nextUrl.searchParams.get('disposition') === 'attachment'
        ? 'attachment'
        : 'inline';
    const { bytes, mimeType, title } = await getKnowledgePreviewBytes(
      auth.user,
      id,
      courseId,
    );
    const safeName =
      title.replace(/[^\w.\-]+/g, '_').slice(0, 180) || 'document';
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
