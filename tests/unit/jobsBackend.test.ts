import { afterEach, describe, expect, it, vi } from 'vitest';

describe('lib/jobs/backend', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to after', async () => {
    delete process.env.JOBS_BACKEND;
    const { jobsBackend, jobsUseInngest } = await import('@/lib/jobs/backend');
    expect(jobsBackend()).toBe('after');
    expect(jobsUseInngest()).toBe(false);
  });

  it('uses inngest when JOBS_BACKEND=inngest', async () => {
    vi.stubEnv('JOBS_BACKEND', 'inngest');
    const { jobsBackend, jobsUseInngest } = await import('@/lib/jobs/backend');
    expect(jobsBackend()).toBe('inngest');
    expect(jobsUseInngest()).toBe(true);
  });
});
