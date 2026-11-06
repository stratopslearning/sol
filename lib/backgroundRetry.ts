/**
 * Schedule background retry of pending short-answer grading.
 *
 * Prefers Inngest when `JOBS_BACKEND=inngest`; otherwise Next.js `after()`.
 * See `lib/jobs/enqueue.ts`.
 */
import { enqueueGradeAttempt } from '@/lib/jobs/enqueue';

/**
 * Enqueues a background retry for a specific attempt. Safe to call from API
 * routes, server actions, and RSCs. Fire-and-forget (does not block the response).
 */
export function scheduleAttemptRetry(
  attemptId: string,
  workspaceId?: string | null,
): void {
  if (!attemptId) return;
  void enqueueGradeAttempt(attemptId, workspaceId ?? 'default');
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
