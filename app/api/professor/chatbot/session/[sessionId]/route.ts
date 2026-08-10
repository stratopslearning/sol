import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { getDiscussionSession } from '@/lib/professor/discussions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { sessionId } = await context.params;
    const session = await getDiscussionSession(auth.user, sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
