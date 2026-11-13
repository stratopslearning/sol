/**
 * Distributed-friendly rate limiter.
 *
 * - Production: backed by Upstash Redis when UPSTASH_REDIS_REST_URL +
 *   UPSTASH_REDIS_REST_TOKEN are set. Sliding window so bursts don't get a
 *   free pass at the boundary of fixed windows.
 * - If Upstash throws at runtime (quota, network), fall back to an in-memory
 *   map for this isolate rather than 429ing every caller. Missing Upstash in
 *   production still fails closed: that is a misconfigured deploy.
 * - Dev / test: in-memory map when Upstash is unset.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/** Include tenant/workspace in Redis keys for fair multi-tenant throttling. */
export function tenantRateLimitKey(
  tenantId: string | null | undefined,
  userId: string,
  action: string,
): string {
  const tenant =
    tenantId && tenantId !== 'default' ? tenantId.trim() : 'unknown-tenant';
  return `${tenant}:${userId}:${action}`;
}

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

/** Skip Upstash for a short window after a runtime error so exams stay up. */
const TRANSIENT_CIRCUIT_MS = 10_000;
/**
 * Quota errors: keep a short circuit so we retry Upstash soon, while still
 * enforcing per-isolate in-memory caps (weaker than Redis, but not unbounded).
 */
const QUOTA_CIRCUIT_MS = 60_000;

let upstashCircuitOpenUntil = 0;

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

function isProdRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

function failClosed(limit: number, windowMs: number): RateLimitResult {
  return {
    success: false,
    limit,
    remaining: 0,
    reset: Date.now() + windowMs,
  };
}

function isUpstashQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /max requests limit exceeded/i.test(message);
}

function isCircuitOpen(): boolean {
  return Date.now() < upstashCircuitOpenUntil;
}

function openCircuit(error: unknown): void {
  const quota = isUpstashQuotaError(error);
  const ms = quota ? QUOTA_CIRCUIT_MS : TRANSIENT_CIRCUIT_MS;
  upstashCircuitOpenUntil = Date.now() + ms;
  console.error(
    quota
      ? `Rate limit: Upstash quota exceeded: falling back to in-memory for ${ms / 1000}s`
      : `Rate limit: Upstash error: falling back to in-memory for ${ms / 1000}s`,
    error,
  );
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
    // Prefer second-based windows. Upstash docs use "10 s" / "1 m".
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

/** Test-only: drop isolate state so cases do not leak counters or a circuit. */
export function resetRateLimitForTests(): void {
  inMemoryStore.clear();
  upstashLimiters.clear();
  redisClient = undefined;
  upstashCircuitOpenUntil = 0;
}

/**
 * Rate-limit by an arbitrary key (e.g. `${userId}:submit` or `${ip}:login`).
 *
 * Returns a RateLimitResult; the caller is responsible for translating a
 * `success: false` into a 429 (or whatever response shape the route uses).
 *
 * Prefer Upstash when configured. A missing Redis client in production fails
 * closed so a misconfigured deploy cannot silently run without a limiter.
 * Runtime Upstash errors (quota, timeouts) fall back to in-memory so a Redis
 * outage cannot brick exam start/save/submit.
 */
export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  prefix?: string;
}): Promise<RateLimitResult> {
  const prefix = opts.prefix ?? 'rl';
  const memoryKey = `${prefix}:${opts.key}`;

  if (isCircuitOpen()) {
    return inMemoryLimit(memoryKey, opts.limit, opts.windowMs);
  }

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
      openCircuit(error);
      return inMemoryLimit(memoryKey, opts.limit, opts.windowMs);
    }
  } else if (isProdRuntime()) {
    console.error(
      'Rate limit: Upstash not configured in production: failing closed',
    );
    return failClosed(opts.limit, opts.windowMs);
  }
  return inMemoryLimit(memoryKey, opts.limit, opts.windowMs);
}
