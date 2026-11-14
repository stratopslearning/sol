/**
 * In-process token bucket per tenant (workspace id). Complements durable
 * `recordAiUsage` rollups — use for burst protection within a single runtime.
 */

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

export type AiBudgetConfig = {
  /** Max tokens per window per tenant. */
  capacity: number;
  /** Refill window in ms. */
  windowMs: number;
};

const DEFAULT_CONFIG: AiBudgetConfig = {
  capacity: 500,
  windowMs: 60_000,
};

function bucketKey(tenantId: string): string {
  return tenantId.trim() || 'unknown';
}

function refill(bucket: Bucket, cfg: AiBudgetConfig, now: number): void {
  const elapsed = now - bucket.updatedAt;
  if (elapsed <= 0) return;
  const rate = cfg.capacity / cfg.windowMs;
  bucket.tokens = Math.min(
    cfg.capacity,
    bucket.tokens + elapsed * rate,
  );
  bucket.updatedAt = now;
}

/** Returns false when the tenant would exceed the in-process budget. */
export function assertProcessAiBudget(
  tenantId: string,
  units = 1,
  cfg: AiBudgetConfig = DEFAULT_CONFIG,
): boolean {
  const key = bucketKey(tenantId);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: cfg.capacity, updatedAt: now };
    buckets.set(key, bucket);
  }
  refill(bucket, cfg, now);
  if (bucket.tokens < units) return false;
  bucket.tokens -= units;
  return true;
}

export function recordProcessAiBudget(
  tenantId: string,
  units = 1,
  cfg: AiBudgetConfig = DEFAULT_CONFIG,
): void {
  assertProcessAiBudget(tenantId, units, cfg);
}

/** Test-only */
export function resetProcessAiBudgetForTests(): void {
  buckets.clear();
}
