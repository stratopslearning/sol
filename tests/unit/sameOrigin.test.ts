import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  allowedOrigins,
  isBodyTooLarge,
  isMutatingMethod,
  isOriginExemptPath,
  isSameOrigin,
  shouldEnforceSameOrigin,
} from '@/lib/api/sameOrigin';

function headers(map: Record<string, string>) {
  return {
    get(name: string) {
      return map[name.toLowerCase()] ?? null;
    },
  };
}

describe('isMutatingMethod', () => {
  it('flags POST PUT PATCH DELETE', () => {
    expect(isMutatingMethod('POST')).toBe(true);
    expect(isMutatingMethod('put')).toBe(true);
    expect(isMutatingMethod('GET')).toBe(false);
    expect(isMutatingMethod('OPTIONS')).toBe(false);
  });
});

describe('isOriginExemptPath', () => {
  it('exempts webhooks, cron, and mcp', () => {
    expect(isOriginExemptPath('/api/stripe/webhook')).toBe(true);
    expect(isOriginExemptPath('/api/clerk/webhook')).toBe(true);
    expect(isOriginExemptPath('/api/cron/grade-pending')).toBe(true);
    expect(isOriginExemptPath('/api/mcp')).toBe(true);
    expect(isOriginExemptPath('/api/quiz/x/submit')).toBe(false);
  });
});

describe('allowedOrigins / isSameOrigin', () => {
  const prevBase = process.env.NEXT_PUBLIC_BASE_URL;
  const prevVercel = process.env.VERCEL_URL;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://www.strat-ops.net';
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    if (prevBase === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = prevBase;
    if (prevVercel === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = prevVercel;
    vi.unstubAllEnvs();
    if (prevNodeEnv !== undefined) {
      vi.stubEnv('NODE_ENV', prevNodeEnv);
    }
  });

  it('includes NEXT_PUBLIC_BASE_URL', () => {
    expect(allowedOrigins()).toContain('https://www.strat-ops.net');
  });

  it('accepts matching Origin', () => {
    expect(
      isSameOrigin({
        headers: headers({ origin: 'https://www.strat-ops.net' }),
      }),
    ).toBe(true);
  });

  it('rejects cross-site Origin', () => {
    expect(
      isSameOrigin({
        headers: headers({ origin: 'https://evil.example' }),
      }),
    ).toBe(false);
  });

  it('accepts matching Referer when Origin is absent', () => {
    expect(
      isSameOrigin({
        headers: headers({
          referer: 'https://www.strat-ops.net/learning/dashboard',
        }),
      }),
    ).toBe(true);
  });

  it('fails closed when both Origin and Referer are missing', () => {
    expect(isSameOrigin({ headers: headers({}) })).toBe(false);
  });

  it('includes VERCEL_URL as https origin', () => {
    process.env.VERCEL_URL = 'sol-git-preview.vercel.app';
    expect(allowedOrigins()).toContain('https://sol-git-preview.vercel.app');
  });
});

describe('shouldEnforceSameOrigin', () => {
  it('skips GET and exempt paths', () => {
    expect(
      shouldEnforceSameOrigin('GET', '/api/quiz/x/submit', null, false),
    ).toBe(false);
    expect(
      shouldEnforceSameOrigin('POST', '/api/stripe/webhook', null, false),
    ).toBe(false);
    expect(
      shouldEnforceSameOrigin('POST', '/api/cron/grade-pending', null, false),
    ).toBe(false);
  });

  it('skips Bearer PAT and load-test', () => {
    expect(
      shouldEnforceSameOrigin(
        'POST',
        '/api/professor/quiz/create',
        'Bearer sol_pat_abc',
        false,
      ),
    ).toBe(false);
    expect(
      shouldEnforceSameOrigin('POST', '/api/quiz/x/submit', null, true),
    ).toBe(false);
  });

  it('enforces on cookie quiz submit', () => {
    expect(
      shouldEnforceSameOrigin('POST', '/api/quiz/x/submit', null, false),
    ).toBe(true);
  });
});

describe('isBodyTooLarge', () => {
  it('rejects when Content-Length exceeds max', () => {
    expect(isBodyTooLarge('2000000', 1_048_576)).toBe(true);
    expect(isBodyTooLarge('100', 1_048_576)).toBe(false);
    expect(isBodyTooLarge(null)).toBe(false);
  });
});
