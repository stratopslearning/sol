import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { attempts, professorSections } from '@/app/db/schema';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { regradeAttempt } from '@/lib/regradeAttempt';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  fallbackOnly: z.boolean().optional().default(true),
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const user = await getOrCreateUser();

    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `regrade:${user.id}`,
      limit: 20,
      windowMs: 5 * 60_000,
      prefix: 'rl',
      message: 'Too many re-grade requests. Please wait a moment and try again.',
    });
    if (limited) return limited;

    const rawBody = await _req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const attempt = await db.query.attempts.findFirst({
      where: eq(attempts.id, attemptId),
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (!attempt.submittedAt) {
      return NextResponse.json(
        { error: 'Only submitted attempts can be re-graded' },
        { status: 400 },
      );
    }

    if (user.role !== 'ADMIN') {
      const professorSectionsList = await db.query.professorSections.findMany({
        where: eq(professorSections.professorId, user.id),
      });
      const enrolledSectionIds = professorSectionsList.map(
        (section) => section.sectionId,
      );

      if (!enrolledSectionIds.includes(attempt.sectionId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const result = await regradeAttempt(attemptId, {
      fallbackOnly: parsed.data.fallbackOnly,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Re-grade attempt error:', error);
    if (error instanceof Error && error.message === 'Attempt not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof Error &&
      error.message === 'Only submitted attempts can be re-graded'
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to re-grade attempt' },
      { status: 500 },
    );
  }
}
