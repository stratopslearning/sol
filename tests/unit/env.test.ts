/**
 * Env validator unit tests. These verify that misconfiguration crashes the
 * loader (so instrumentation.ts can fail-fast at boot).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('lib/env', () => {
  it('throws when DATABASE_URL is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/Invalid environment configuration/);
  });

  it('throws in production without NEXT_PUBLIC_BASE_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk');
    vi.stubEnv('CLERK_SECRET_KEY', 'sk');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec');
    vi.stubEnv('STRIPE_PRICE_ID', 'price');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/NEXT_PUBLIC_BASE_URL/);
  });

  it('accepts a valid dev configuration', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_dev');
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_dev');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_dev');
    const mod = await import('@/lib/env');
    expect(() => mod.env()).not.toThrow();
    expect(mod.env().NODE_ENV).toBe('development');
  });
});
