/**
 * Bulk re-grade every attempt in the professor's attention queue.
 *
 * Schedules work via Inngest (`JOBS_BACKEND=inngest`) or Next.js `after()`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { jobsBackend } from '@/lib/jobs/backend';
import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';
import { enqueueBulkRegrades } from '@/lib/gradingBatch';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const HARD_CAP = 50;

const bodySchema = z.object({
  /** Optional explicit subset; defaults to the full attention queue. */
  attemptIds: z.array(z.string().uuid()).max(HARD_CAP).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireProfessorApi(req, { scope: 'grades:write' });

    const limited = await enforceRateLimit({
      key: `regrade-all:${user.id}`,
      limit: 6,
      windowMs: 10 * 60_000,
      prefix: 'rl',
      message:
        'Too many bulk re-grade requests. Wait a few minutes and try again.',
    });
    if (limited) return limited;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const queue = await getAttentionItemsForProfessor(user.id, {
      limit: HARD_CAP,
    });
    let targets = queue.map((q) => q.attemptId);

    if (parsed.data.attemptIds && parsed.data.attemptIds.length > 0) {
      const allowed = new Set(targets);
      targets = parsed.data.attemptIds.filter((id) => allowed.has(id));
    }

    if (targets.length === 0) {
      return NextResponse.json({
        scheduled: 0,
        message: 'No attempts in your attention queue.',
      });
    }

    const firstAttempt = await db.query.attempts.findFirst({
      where: eq(attempts.id, targets[0]!),
      columns: { tenantId: true },
    });
    const workspaceId = firstAttempt?.tenantId ?? 'default';

    const batch = await enqueueBulkRegrades({
      tenantId: workspaceId,
      attemptIds: targets,
      professorId: user.id,
    });

    return NextResponse.json({
      success: true,
      scheduled: targets.length,
      mode: batch.mode,
      batchId: batch.batchId ?? null,
      backend: jobsBackend(),
      message:
        batch.mode === 'openai_batch'
          ? `Overnight batch regrade submitted for ${targets.length} attempts.`
          : `Re-grading ${targets.length} attempt${
              targets.length === 1 ? '' : 's'
            } in the background. Refresh in a minute to see progress.`,
    });
  } catch (error) {
    console.error('Bulk re-grade error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json(
      { error: 'Failed to schedule bulk re-grade' },
      { status: 500 },
    );
  }
}
