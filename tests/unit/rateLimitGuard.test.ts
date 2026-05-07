import { beforeEach, describe, expect, it } from 'vitest';

import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe('enforceRateLimit', () => {
  it('returns null while under the limit', async () => {
    const key = `test-${Date.now()}`;
    const r = await enforceRateLimit({ key, limit: 2, windowMs: 60_000 });
    expect(r).toBeNull();
  });

  it('returns a 429 NextResponse when the limit is exceeded', async () => {
    const key = `test-${Date.now()}`;
    await enforceRateLimit({ key, limit: 1, windowMs: 60_000 });
    const second = await enforceRateLimit({ key, limit: 1, windowMs: 60_000 });
    expect(second).not.toBeNull();
    expect(second!.status).toBe(429);
    const body = await second!.json();
    expect(body.code).toBe('rate_limited');
    expect(second!.headers.get('Retry-After')).toBeTruthy();
    expect(second!.headers.get('RateLimit-Limit')).toBe('1');
  });
});
