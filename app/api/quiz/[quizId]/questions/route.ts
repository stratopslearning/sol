import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { questions } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const quizQuestions = await db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
      orderBy: (questions, { asc }) => [asc(questions.order)],
    });

    return NextResponse.json({ questions: quizQuestions });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
} 