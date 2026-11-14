/**
 * Daily background grader for `pending` short-answer questions.
 *
 * Strategy notes:
 *   - Vercel's Hobby plan caps cron frequency at once per day, so the
 *     real-time recovery of pending grades doesn't depend on this cron.
 *     The submit handler and the student/professor view pages each enqueue
 *     grading via `lib/backgroundRetry.ts` (Inngest or `after()`), which
 *     makes the system self-healing within seconds of any user activity.
 *   - This cron is a long-tail safety net: it sweeps up attempts that have
 *     been sitting for hours with no user activity (e.g. nightly when
 *     nobody is on the platform).
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron sends
 * this header automatically when the schedule is configured in `vercel.json`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';
import { isCronAuthorized } from '@/lib/api/cronAuth';
import { sweepStaleInProgressAttempts } from '@/lib/autoSubmitInProgressAttempt';
import {
  gradePendingForAttempt,
  type GradePendingResult,
} from '@/lib/pendingGrader';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_LIMIT = 25;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const autoSubmitSweep = await sweepStaleInProgressAttempts();

    const pendingAttempts = await db.query.attempts.findMany({
      where: inArray(attempts.gradingStatus, ['partial', 'failed']),
      limit: BATCH_LIMIT,
      orderBy: (cols, { asc }) => [asc(cols.submittedAt)],
    });

    if (pendingAttempts.length === 0) {
      return NextResponse.json({
        processed: 0,
        attempts: [],
        autoSubmitSweep,
      });
    }

    const results: GradePendingResult[] = [];
    for (const attempt of pendingAttempts) {
      try {
        results.push(await gradePendingForAttempt(attempt));
      } catch (error) {
        console.error('cron grade-pending failed for attempt', attempt.id, error);
      }
    }

    return NextResponse.json({
      processed: results.length,
      attempts: results,
      autoSubmitSweep,
    });
  } catch (error) {
    console.error('cron grade-pending error', error);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}

export const POST = GET;
