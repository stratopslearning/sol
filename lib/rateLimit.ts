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
  // Dynamic lookup avoids Next.js build-time inlining of undefined server secrets.
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
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
    // Prefer second-based windows — Upstash docs use "10 s" / "1 m".
    const window =
      windowMs % 60_000 === 0
        ? (`${windowMs / 60_000} m` as `${number} m`)
        : (`${Math.max(1, Math.ceil(windowMs / 1000))} s` as `${number} s`);
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, window),
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
 *
 * Prefer Upstash when configured. If it is missing at runtime, fall back to
 * the in-memory limiter and log loudly — fail-closed 429s were blocking
 * legitimate first requests (token mint / MCP) whenever the Redis env was
 * unavailable in a given serverless isolate.
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
    try {
      const res = await upstash.limit(opts.key);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch (error) {
      console.error('Rate limit: Upstash error — falling back to in-memory', error);
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error(
      'Rate limit: Upstash not configured in production — falling back to in-memory',
    );
  }
  return inMemoryLimit(`${prefix}:${opts.key}`, opts.limit, opts.windowMs);
}
