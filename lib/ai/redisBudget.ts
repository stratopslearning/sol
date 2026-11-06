/**
 * Distributed AI budget counters (Wave 4 item 24).
 *
 * Upstash Redis, atomic via a single Lua script (check-and-increment in one
 * round trip — no read-then-write race across serverless isolates).
 * Fixed window per tenant: key = ai:budget:<tenant>:<windowIndex>.
 *
 * Without Upstash env (local/dev/test) callers fall back to the in-process
 * bucket in lib/ai/budget.ts. Redis runtime errors also fall back (fail open to
 * the weaker per-isolate cap rather than taking exams/tutoring down); durable
 * accounting still lands in workspace_usage_daily via recordAiUsage.
 */
import { Redis } from '@upstash/redis';

import { assertProcessAiBudget, type AiBudgetConfig } from '@/lib/ai/budget';

export type BudgetDecision = {
  allowed: boolean;
  /** Units left in the window after this reservation (best effort). */
  remaining: number;
  backend: 'redis' | 'process';
};

const DEFAULT_CAPACITY = 500;
const DEFAULT_WINDOW_MS = 60_000;

// KEYS[1]=counter, ARGV[1]=units, ARGV[2]=capacity, ARGV[3]=ttl ms
// returns remaining (>=0) when allowed, -1 when over budget.
export const BUDGET_LUA = `
local cur = tonumber(redis.call('GET', KEYS[1]) or '0')
local units = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
if cur + units > cap then
  return -1
end
local nv = redis.call('INCRBY', KEYS[1], units)
if nv == units then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
end
return cap - nv
`;

let redis: Redis | undefined;
let circuitOpenUntil = 0;

function getRedis(): Redis | null {
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (!url || !token) return null;
  if (!redis) redis = new Redis({ url, token });
  return redis;
}

export function budgetConfigFromEnv(): AiBudgetConfig {
  const capacity = Number(process.env.AI_BUDGET_CAPACITY ?? DEFAULT_CAPACITY);
  const windowMs = Number(process.env.AI_BUDGET_WINDOW_MS ?? DEFAULT_WINDOW_MS);
  return {
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : DEFAULT_CAPACITY,
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS,
  };
}

export function budgetKey(tenantId: string, now: number, windowMs: number): string {
  return `ai:budget:${tenantId.trim() || 'unknown'}:${Math.floor(now / windowMs)}`;
}

/** Atomically reserve `units` for the tenant. Never throws. */
export async function reserveRedisBudget(
  tenantId: string,
  units = 1,
  cfg: AiBudgetConfig = budgetConfigFromEnv(),
): Promise<BudgetDecision> {
  const client = getRedis();
  if (client && Date.now() >= circuitOpenUntil) {
    try {
      const key = budgetKey(tenantId, Date.now(), cfg.windowMs);
      const res = (await client.eval(
        BUDGET_LUA,
        [key],
        [units, cfg.capacity, cfg.windowMs],
      )) as number;
      return res < 0
        ? { allowed: false, remaining: 0, backend: 'redis' }
        : { allowed: true, remaining: res, backend: 'redis' };
    } catch (err) {
      circuitOpenUntil = Date.now() + 10_000;
      console.error('[ai.budget] Upstash error; using in-process budget', err);
    }
  }
  const allowed = assertProcessAiBudget(tenantId, units, cfg);
  return { allowed, remaining: allowed ? -1 : 0, backend: 'process' };
}
