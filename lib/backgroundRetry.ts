/**
 * Fire-and-forget background retry of pending short-answer grading.
 *
 * Why this exists:
 *   Vercel's Hobby plan limits cron jobs to once per day, so we can't lean
 *   on a per-minute cron worker to clear `pending` items quickly. Instead,
 *   any time a server route or RSC notices a pending question we schedule
 *   a retry to run *after* the response is sent using Next.js's `after()`.
 *
 * Behavior:
 *   - `scheduleAttemptRetry(attemptId)` enqueues a background retry for a
 *     specific attempt. Safe to call from API routes, server actions, and
 *     RSCs. The student/professor see the page render instantly; the retry
 *     happens within the function's existing `maxDuration` budget after the
 *     response is flushed.
 *   - Errors inside the background task are caught and logged. They never
 *     bubble up to the user-visible request.
 *   - A small in-memory de-dupe set prevents the same attempt from being
 *     retried twice within a single function invocation (e.g. when a page
 *     and its loader both call this for the same id).
 *
 * Pairing:
 *   - The submit handler calls this whenever `pendingQuestionCount > 0`.
 *   - The student review page and professor attempt page call this when
 *     rendering an attempt that still has any pending status.
 *   - The daily Vercel cron at `/api/cron/grade-pending` cleans up any
 *     attempts that nobody opened (e.g. overnight backlog).
 */
import { after } from 'next/server';

import { gradePendingForAttemptId } from '@/lib/pendingGrader';

const inFlight = new Set<string>();

export function scheduleAttemptRetry(attemptId: string): void {
  if (!attemptId) return;
  if (inFlight.has(attemptId)) return;
  inFlight.add(attemptId);

  try {
    after(async () => {
      try {
        const result = await gradePendingForAttemptId(attemptId);
        if (result.regraded > 0 || result.promoted > 0) {
          console.info('[backgroundRetry] processed attempt', {
            attemptId,
            regraded: result.regraded,
            stillPending: result.stillPending,
            promoted: result.promoted,
          });
        }
      } catch (error) {
        console.error('[backgroundRetry] error', { attemptId, error });
      } finally {
        inFlight.delete(attemptId);
      }
    });
  } catch (error) {
    // `after()` throws synchronously if called outside a request scope.
    // Fall back to an immediate fire-and-forget promise so we still try.
    inFlight.delete(attemptId);
    void gradePendingForAttemptId(attemptId).catch((err) => {
      console.error('[backgroundRetry] fallback error', {
        attemptId,
        scheduler: error instanceof Error ? error.message : String(error),
        err,
      });
    });
  }
}

/**
 * Lightweight check used by RSCs that already have the feedback object in
 * hand. Returns true if any short-answer entry on the attempt is still
 * pending or in manual_review and would benefit from a background retry.
 */
export function attemptNeedsBackgroundRetry(
  gptFeedback: unknown,
): boolean {
  if (!gptFeedback || typeof gptFeedback !== 'object') return false;
  for (const value of Object.values(gptFeedback as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const status = (value as { status?: string }).status;
    if (status === 'pending' || status === 'manual_review') return true;
  }
  return false;
}
