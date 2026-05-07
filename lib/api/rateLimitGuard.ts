/**
 * Tiny helper that wraps `lib/rateLimit` and, on quota exhaustion, returns a
 * standardized 429 response instead of throwing. Routes that want a
 * single-line guard can do:
 *
 *   const limited = await enforceRateLimit({ key: `submit:${userId}`, limit: 30, windowMs: 5 * 60_000 });
 *   if (limited) return limited;
 *
 * Reset/limit/remaining are exposed both via `Retry-After` (RFC 6585) and via
 * the standard `RateLimit-*` headers consumed by browsers and our own client.
 */
import { NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { rateLimit, type RateLimitResult } from '@/lib/rateLimit';

export interface RateLimitGuardOptions {
  key: string;
  limit: number;
  windowMs: number;
  prefix?: string;
  message?: string;
}

function attachHeaders(res: NextResponse, result: RateLimitResult) {
  const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  res.headers.set('Retry-After', String(retryAfterSeconds));
  res.headers.set('RateLimit-Limit', String(result.limit));
  res.headers.set('RateLimit-Remaining', String(result.remaining));
  res.headers.set('RateLimit-Reset', String(retryAfterSeconds));
  return res;
}

/**
 * Returns `null` when the request is allowed, or a ready-to-return
 * `NextResponse` when it must be rejected with 429.
 */
export async function enforceRateLimit(
  opts: RateLimitGuardOptions,
): Promise<NextResponse | null> {
  const result = await rateLimit({
    key: opts.key,
    limit: opts.limit,
    windowMs: opts.windowMs,
    prefix: opts.prefix,
  });
  if (result.success) {
    return null;
  }
  const message = opts.message ?? 'Too many requests. Please try again later.';
  const res = jsonError(
    ApiError.tooMany(message, {
      retryAfterSeconds: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
    }),
  );
  return attachHeaders(res, result);
}
