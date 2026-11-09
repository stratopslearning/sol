import { NextRequest, NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { duplicateQuiz } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(req, { scope: 'quizzes:write' });

    const limited = await enforceRateLimit({
      key: `quiz-dup:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many duplicate requests. Please wait a moment.',
    });
    if (limited) return limited;

    const newQuiz = await duplicateQuiz(user, quizId);

    return NextResponse.json({
      success: true,
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
      },
    });
  } catch (error) {
    console.error('Quiz duplication error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json(
      { error: 'Failed to duplicate quiz' },
      { status: 500 },
    );
  }
}
