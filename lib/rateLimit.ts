/**
 * Distributed-friendly rate limiter.
 *
 * - Production: backed by Upstash Redis when UPSTASH_REDIS_REST_URL +
 *   UPSTASH_REDIS_REST_TOKEN are set. Sliding window so bursts don't get a
 *   free pass at the boundary of fixed windows.
 * - Dev / single-instance fallback: in-memory map. NOT safe across multiple
 *   instances (each Lambda has its own counter), but a sane safety net so
 *   the app never crashes when Upstash is unconfigured.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms when the window resets
}

interface InMemoryWindow {
  start: number;
  count: number;
}

const inMemoryStore = new Map<string, InMemoryWindow>();

function inMemoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = inMemoryStore.get(key);
  if (!existing || now - existing.start >= windowMs) {
    inMemoryStore.set(key, { start: now, count: 1 });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }
  existing.count += 1;
  return {
    success: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.start + windowMs,
  };
}

let redisClient: Redis | undefined;
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(
  prefix: string,
  limit: number,
  windowMs: number,
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }
  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Rate-limit by an arbitrary key (e.g. `${userId}:submit` or `${ip}:login`).
 *
 * Returns a RateLimitResult; the caller is responsible for translating a
 * `success: false` into a 429 (or whatever response shape the route uses).
 */
export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  prefix?: string;
}): Promise<RateLimitResult> {
  const prefix = opts.prefix ?? 'rl';
  const upstash = getUpstashLimiter(prefix, opts.limit, opts.windowMs);
  if (upstash) {
    const res = await upstash.limit(opts.key);
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  }
  return inMemoryLimit(`${prefix}:${opts.key}`, opts.limit, opts.windowMs);
}
