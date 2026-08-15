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

function stubProductionBase() {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk');
  vi.stubEnv('CLERK_SECRET_KEY', 'sk');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
  vi.stubEnv('NEXT_PUBLIC_PAYMENTS_ENABLED', 'false');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
  vi.stubEnv('CRON_SECRET', 'cron-secret');
  vi.stubEnv('OPENAI_API_KEY', 'sk-openai');
  vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', 'whsec_test');
}

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

  it('throws in production without Upstash', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk');
    vi.stubEnv('CLERK_SECRET_KEY', 'sk');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
    vi.stubEnv('NEXT_PUBLIC_PAYMENTS_ENABLED', 'false');
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', undefined as unknown as string);
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', undefined as unknown as string);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/UPSTASH_REDIS/);
  });

  it('throws in production without CRON_SECRET', async () => {
    stubProductionBase();
    vi.stubEnv('CRON_SECRET', undefined as unknown as string);
    delete process.env.CRON_SECRET;
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/CRON_SECRET/);
  });

  it('throws in production without OPENAI_API_KEY', async () => {
    stubProductionBase();
    vi.stubEnv('OPENAI_API_KEY', undefined as unknown as string);
    delete process.env.OPENAI_API_KEY;
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/OPENAI_API_KEY/);
  });

  it('throws in Vercel production if LOAD_TEST_SECRET is set', async () => {
    stubProductionBase();
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('LOAD_TEST_SECRET', 'load-test-secret-16');
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/LOAD_TEST_SECRET/);
  });

  it('allows LOAD_TEST_SECRET on Vercel preview', async () => {
    stubProductionBase();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('LOAD_TEST_SECRET', 'load-test-secret-16');
    const mod = await import('@/lib/env');
    expect(() => mod.env()).not.toThrow();
  });

  it('throws in production without CLERK_WEBHOOK_SIGNING_SECRET', async () => {
    stubProductionBase();
    vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', undefined as unknown as string);
    vi.stubEnv('CLERK_WEBHOOK_SECRET', undefined as unknown as string);
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    delete process.env.CLERK_WEBHOOK_SECRET;
    const mod = await import('@/lib/env');
    expect(() => mod.env()).toThrow(/CLERK_WEBHOOK/);
  });

  it('accepts production with Upstash, CRON_SECRET, and OPENAI_API_KEY configured', async () => {
    stubProductionBase();
    const mod = await import('@/lib/env');
    expect(() => mod.env()).not.toThrow();
  });
});
