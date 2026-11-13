import { NextRequest, NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { duplicateDiscussion } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireProfessorApi(_req, {
      scope: 'discussions:write',
    });

    const limited = await enforceRateLimit({
      key: `chatbot-dup:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await context.params;
    const created = await duplicateDiscussion(user, id);

    return NextResponse.json({
      success: true,
      chatbot: { id: created.id, title: created.title },
    });
  } catch (error) {
    console.error('Chatbot duplicate error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json(
      { error: 'Failed to duplicate discussion' },
      { status: 500 },
    );
  }
}
