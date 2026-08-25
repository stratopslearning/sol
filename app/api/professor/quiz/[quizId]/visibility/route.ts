import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { setQuizVisibility } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

const visibilitySchema = z.object({
  isActive: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(req, { scope: 'quizzes:write' });

    const limited = await enforceRateLimit({
      key: `quiz-visibility:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many visibility updates. Please wait a moment.',
    });
    if (limited) return limited;

    const body = visibilitySchema.parse(await readJsonBody(req));
    const updated = await setQuizVisibility(user, quizId, body.isActive);

    return NextResponse.json({
      success: true,
      quizId: updated.id,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('Error updating quiz visibility:', error);
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 },
    );
  }
}
