import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { assignDiscussion } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

const assignSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireProfessorApi(req, {
      scope: 'discussions:write',
    });

    const limited = await enforceRateLimit({
      key: `chatbot-assign:${user.id}`,
      limit: 40,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many assign requests. Please wait a moment.',
    });
    if (limited) return limited;

    const { id } = await context.params;
    const body = assignSchema.parse(await readJsonBody(req));
    await assignDiscussion(user, id, body.sectionIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chatbot assign error:', error);
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
  }
}
