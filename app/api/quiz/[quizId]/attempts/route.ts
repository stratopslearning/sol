import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { attempts, assignments, quizzes } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const quizId = params.quizId;
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Authorization: the assignment must belong to the caller (or caller must be
    // a privileged role). This prevents IDOR where one student reads another's attempts.
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, assignmentId),
        eq(assignments.quizId, quizId),
      ),
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const isOwner = assignment.studentId === user.id;
    const isPrivileged = user.role === 'ADMIN' || user.role === 'PROFESSOR';
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all attempts for this assignment (already scoped by assignmentId, which
    // we've verified above).
    const allAttempts = await db.query.attempts.findMany({
      where: and(
        eq(attempts.assignmentId, assignmentId),
        eq(attempts.quizId, quizId)
      ),
      orderBy: (attempts, { desc }) => [desc(attempts.submittedAt)],
    });

    if (allAttempts.length === 0) {
      return NextResponse.json({ attempts: [], bestScore: 0, bestPercentage: 0 });
    }

    // Calculate best score
    const bestScore = Math.max(...allAttempts.map(a => a.score || 0));
    const candidateMaxScore = allAttempts.find(a => a.maxScore)?.maxScore || 0;
    const bestPercentage = candidateMaxScore > 0
      ? Math.round((bestScore / candidateMaxScore) * 100)
      : 0;

    // Get quiz details for max attempts
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });

    // Format attempts with attempt numbers
    const formattedAttempts = allAttempts.map((attempt, index) => ({
      id: attempt.id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
      attemptNumber: allAttempts.length - index, // Reverse order: latest = highest number
      gptFeedback: attempt.gptFeedback,
    }));

    return NextResponse.json({
      attempts: formattedAttempts,
      bestScore,
      bestPercentage,
      totalAttempts: allAttempts.length,
      maxAttempts: quiz?.maxAttempts || 1,
      attemptsRemaining: (quiz?.maxAttempts || 1) - allAttempts.length,
    });

  } catch (error) {
    console.error('Error fetching attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attempts' },
      { status: 500 }
    );
  }
}
