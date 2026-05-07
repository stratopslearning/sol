/**
 * Unit tests for the in-memory rate limiter fallback. We don't test Upstash
 * here — the integration test environment can swap in the real driver.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { rateLimit } from '@/lib/rateLimit';

const baseKey = () => `${Date.now()}-${Math.random()}`;

beforeEach(() => {
  // Make sure Upstash env vars are unset so rateLimit() takes the in-memory
  // path. Vitest gives each test a fresh process.env unless we mutate it.
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe('rateLimit (in-memory)', () => {
  it('allows requests under the limit', async () => {
    const key = baseKey();
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit({ key, limit: 5, windowMs: 60_000 });
      expect(r.success).toBe(true);
    }
  });

  it('rejects requests over the limit', async () => {
    const key = baseKey();
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit({ key, limit: 3, windowMs: 60_000 });
      expect(r.success).toBe(true);
    }
    const over = await rateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(over.success).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it('isolates buckets by key', async () => {
    const a = baseKey();
    const b = baseKey();
    await rateLimit({ key: a, limit: 1, windowMs: 60_000 });
    const blocked = await rateLimit({ key: a, limit: 1, windowMs: 60_000 });
    const fresh = await rateLimit({ key: b, limit: 1, windowMs: 60_000 });
    expect(blocked.success).toBe(false);
    expect(fresh.success).toBe(true);
  });
});
