import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { createDiscussion } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  personaName: z.string().min(1).max(100).default('Professor Emma'),
  instructions: z.string().min(1).max(10_000),
  systemPrompt: z.string().min(1).max(50_000),
  relatedQuizId: z.string().uuid().nullable().optional(),
  sectionIds: z.array(z.string().uuid()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireProfessorApi(req, {
      scope: 'discussions:write',
    });

    const limited = await enforceRateLimit({
      key: `chatbot-create:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const body = createSchema.parse(await readJsonBody(req));
    const created = await createDiscussion(user, body);

    return NextResponse.json({
      success: true,
      chatbot: { id: created.id, title: created.title },
    });
  } catch (error) {
    console.error('Chatbot create error:', error);
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 },
    );
  }
}
