/**
 * Bulk re-grade every attempt in the professor's attention queue.
 *
 * Why a dedicated endpoint:
 *   - One rate-limit check instead of N (the per-attempt /regrade endpoint
 *     is limited to 20 calls per 5 minutes, which a single "re-grade all"
 *     click could blow through trivially).
 *   - We schedule the actual work via Next's `after()` so the UI gets an
 *     instant ack and the function continues processing in the background
 *     within the function's `maxDuration` budget. This works on Vercel
 *     Hobby (where per-minute cron isn't an option).
 *
 * Behavior:
 *   - Identifies attempts using `getAttentionItemsForProfessor` (same
 *     query that drives the attention page), then runs `regradeAttempt`
 *     for each one with bounded concurrency.
 *   - Returns immediately with `scheduled: N` so the client can show a
 *     toast and `router.refresh()`.
 *   - Errors per attempt are caught and logged; one bad attempt never
 *     blocks the rest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';
import { regradeAttempt } from '@/lib/regradeAttempt';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_CONCURRENCY = 3;
const HARD_CAP = 50;

const bodySchema = z.object({
  /** Optional explicit subset; defaults to the full attention queue. */
  attemptIds: z.array(z.string().uuid()).max(HARD_CAP).optional(),
});

async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const next = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        await worker(items[idx]!);
      } catch (error) {
        console.error('[regrade-all] worker error', error);
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, next));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bulk action is intentionally rarer than per-attempt. Six clicks per
    // ten minutes is plenty for fixing a backlog.
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

    // Schedule the work after the response is sent. The function keeps
    // running in its maxDuration budget; the UI is unblocked immediately.
    after(async () => {
      console.info('[regrade-all] starting', {
        professorId: user.id,
        count: targets.length,
      });
      const startedAt = Date.now();
      let regraded = 0;
      let stillPending = 0;
      let errors = 0;

      await processWithConcurrency(targets, BATCH_CONCURRENCY, async (id) => {
        try {
          const result = await regradeAttempt(id, { fallbackOnly: true });
          regraded += result.regradedQuestionCount;
          stillPending += result.pendingQuestionCount;
        } catch (error) {
          errors += 1;
          console.error('[regrade-all] attempt failed', { id, error });
        }
      });

      console.info('[regrade-all] done', {
        professorId: user.id,
        durationMs: Date.now() - startedAt,
        count: targets.length,
        regraded,
        stillPending,
        errors,
      });
    });

    return NextResponse.json({
      success: true,
      scheduled: targets.length,
      message: `Re-grading ${targets.length} attempt${
        targets.length === 1 ? '' : 's'
      } in the background. Refresh in a minute to see progress.`,
    });
  } catch (error) {
    console.error('Bulk re-grade error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule bulk re-grade' },
      { status: 500 },
    );
  }
}
