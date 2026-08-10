import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { listDiscussionSessions } from '@/lib/professor/discussions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await context.params;
    const sessions = await listDiscussionSessions(auth.user, id);
    return NextResponse.json({ sessions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
