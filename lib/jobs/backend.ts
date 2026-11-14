/**
 * Job backend selector.
 *
 * - `after` — Next.js `after()` (legacy / safe default without Inngest Dev Server)
 * - `inngest` — durable queue (local Dev Server or Inngest Cloud)
 *
 * Set `JOBS_BACKEND=inngest` in `.env.local` when running `npm run jobs:dev`.
 */
export type JobsBackend = 'after' | 'inngest';

export function jobsBackend(): JobsBackend {
  const raw = process.env.JOBS_BACKEND?.trim().toLowerCase();
  if (raw === 'inngest') return 'inngest';
  return 'after';
}

export function jobsUseInngest(): boolean {
  return jobsBackend() === 'inngest';
}
