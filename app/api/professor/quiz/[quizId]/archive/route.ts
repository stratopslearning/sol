import { NextRequest, NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { archiveQuiz } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(req, { scope: 'quizzes:write' });

    const limited = await enforceRateLimit({
      key: `quiz-archive:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many archive requests. Please wait a moment.',
    });
    if (limited) return limited;

    const archived = await archiveQuiz(user, quizId);

    return NextResponse.json({
      success: true,
      quizId: archived.id,
      message: 'Quiz archived successfully',
    });
  } catch (error) {
    console.error('Error archiving quiz:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json({ error: 'Failed to archive quiz' }, { status: 500 });
  }
}
