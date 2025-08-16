import { NextRequest, NextResponse } from 'next/server';
import { gradeShortAnswer } from '@/lib/grading';

export async function POST(req: NextRequest) {
  try {
    const { question, studentAnswer, correctAnswer, maxPoints } = await req.json();

    // Validate input
    if (!question || !studentAnswer || !maxPoints) {
      return NextResponse.json(
        { error: 'Missing required fields: question, studentAnswer, maxPoints' },
        { status: 400 }
      );
    }

    // Test the grading function
    const result = await gradeShortAnswer({
      question,
      studentAnswer,
      correctAnswer,
      maxPoints,
      questionType: 'SHORT_ANSWER'
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Test grading error:', error);
    return NextResponse.json(
      { error: 'Failed to test grading', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 