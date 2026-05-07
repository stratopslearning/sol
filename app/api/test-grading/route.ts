import { NextRequest, NextResponse } from 'next/server';

import { gradeShortAnswer } from '@/lib/grading';
import { assertDevOrAdmin } from '@/lib/devGate';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await assertDevOrAdmin();
  if (gate) return gate;

  // Even in dev, this hits OpenAI; throttle to prevent accidental cost spikes
  // when a script repeatedly POSTs to verify behavior.
  const user = await getOrCreateUser();
  const rateKey = user?.id ?? 'anonymous';
  const limited = await enforceRateLimit({
    key: `test-grading:${rateKey}`,
    limit: 5,
    windowMs: 60_000,
    prefix: 'rl',
    message: 'Test grading rate limit exceeded.',
  });
  if (limited) return limited;

  try {
    const { question, studentAnswer, correctAnswer, maxPoints } = await req.json();

    if (!question || !studentAnswer || !maxPoints) {
      return NextResponse.json(
        { error: 'Missing required fields: question, studentAnswer, maxPoints' },
        { status: 400 },
      );
    }

    const result = await gradeShortAnswer({
      question,
      studentAnswer,
      correctAnswer,
      maxPoints,
      questionType: 'SHORT_ANSWER',
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Test grading error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test grading',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
