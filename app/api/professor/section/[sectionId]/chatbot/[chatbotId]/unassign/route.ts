import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { unassignDiscussionFromSection } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ sectionId: string; chatbotId: string }> },
) {
  try {
    const { user } = await requireProfessorApi(_req, { scope: 'sections:write' });

    const limited = await enforceRateLimit({
      key: `chatbot-unassign:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many unassign requests. Please wait a moment.',
    });
    if (limited) return limited;

    const { sectionId, chatbotId } = await context.params;
    await unassignDiscussionFromSection(user, sectionId, chatbotId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
