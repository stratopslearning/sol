import { NextRequest, NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { sectionCopyQuiz } from '@/lib/professor/mutations';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { quizId } = await params;
    const { user } = await requireProfessorApi(_req, { scope: 'quizzes:write' });

    const copied = await sectionCopyQuiz(user, quizId);

    return NextResponse.json({
      success: true,
      quiz: {
        id: copied.id,
        title: copied.title,
        sectionIds: copied.sectionIds,
      },
    });
  } catch (error) {
    console.error('Quiz section-copy error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json(
      { error: 'Failed to open quiz for editing' },
      { status: 500 },
    );
  }
}
