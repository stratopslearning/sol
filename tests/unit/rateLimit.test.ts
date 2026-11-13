/**
 * Unit tests for the in-memory rate limiter fallback. We don't test a live
 * Upstash instance here — runtime errors are mocked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class Redis {
    constructor(_opts: unknown) {}
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class Ratelimit {
    static slidingWindow() {
      return { type: 'sliding' };
    }
    async limit(key: string) {
      return limitMock(key);
    }
  },
}));

import { rateLimit, resetRateLimitForTests } from '@/lib/rateLimit';

const baseKey = () => `${Date.now()}-${Math.random()}`;

beforeEach(() => {
  resetRateLimitForTests();
  limitMock.mockReset();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.stubEnv('NODE_ENV', 'test');
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

describe('rateLimit (production fail-closed)', () => {
  it('rejects when Upstash is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const r = await rateLimit({
      key: baseKey(),
      limit: 5,
      windowMs: 60_000,
    });
    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
  });
});

describe('rateLimit (Upstash runtime errors)', () => {
  function stubUpstashEnv() {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
  }

  it('falls back to in-memory when Upstash quota is exceeded', async () => {
    stubUpstashEnv();
    limitMock.mockRejectedValue(
      new Error(
        'Command failed: ERR max requests limit exceeded. Limit: 500000, Usage: 500001',
      ),
    );
    const key = baseKey();
    const first = await rateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(first.success).toBe(true);
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it('circuit-breaks so later calls skip Upstash after a quota error', async () => {
    stubUpstashEnv();
    limitMock.mockRejectedValue(
      new Error(
        'Command failed: ERR max requests limit exceeded. Limit: 500000, Usage: 500001',
      ),
    );
    await rateLimit({ key: baseKey(), limit: 5, windowMs: 60_000 });
    await rateLimit({ key: baseKey(), limit: 5, windowMs: 60_000 });
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it('still enforces the in-memory cap after falling back', async () => {
    stubUpstashEnv();
    limitMock.mockRejectedValue(
      new Error(
        'Command failed: ERR max requests limit exceeded. Limit: 500000, Usage: 500001',
      ),
    );
    const key = baseKey();
    await rateLimit({ key, limit: 1, windowMs: 60_000 });
    const over = await rateLimit({ key, limit: 1, windowMs: 60_000 });
    expect(over.success).toBe(false);
  });
});
