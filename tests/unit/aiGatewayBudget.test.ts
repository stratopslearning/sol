import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn(() => ({ fake: 'client' }));
vi.mock('@/lib/ai/openai', () => ({
  createOpenAIClient: (...a: unknown[]) => createMock(...(a as [])),
}));

import { resetProcessAiBudgetForTests } from '@/lib/ai/budget';
import { getAiClient, PURPOSE_DEFAULTS, runAi } from '@/lib/ai/gateway';
import { BUDGET_LUA, budgetKey, reserveRedisBudget } from '@/lib/ai/redisBudget';

describe('ai gateway', () => {
  beforeEach(() => {
    createMock.mockClear();
    resetProcessAiBudgetForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.AI_GATEWAY_ENFORCE_BUDGET;
    process.env.AI_BUDGET_CAPACITY = '3';
  });
  afterEach(() => {
    delete process.env.AI_BUDGET_CAPACITY;
  });

  it('getAiClient applies per-purpose defaults', () => {
    getAiClient('authoring');
    expect(createMock).toHaveBeenCalledWith({
      maxRetries: PURPOSE_DEFAULTS.authoring.maxRetries,
      timeout: 90_000,
    });
  });

  it('explicit options override defaults', () => {
    getAiClient('grading', { timeout: 5 });
    expect(createMock).toHaveBeenCalledWith({ maxRetries: 2, timeout: 5 });
  });

  it('runAi enforces the tenant budget (process fallback without Upstash)', async () => {
    const fn = vi.fn(async () => 'ok');
    for (let i = 0; i < 3; i++) {
      await expect(runAi({ purpose: 'grading', tenantId: 't1', fn })).resolves.toBe('ok');
    }
    await expect(runAi({ purpose: 'grading', tenantId: 't1', fn })).rejects.toMatchObject({
      status: 429,
    });
    // other tenants unaffected
    await expect(runAi({ purpose: 'grading', tenantId: 't2', fn })).resolves.toBe('ok');
  });

  it('runAi without a tenant skips budget', async () => {
    for (let i = 0; i < 10; i++) {
      await runAi({ purpose: 'embed', fn: async () => 1 });
    }
  });

  it('redis budget falls back to process backend when Upstash unset', async () => {
    const d = await reserveRedisBudget('t9', 1);
    expect(d).toMatchObject({ allowed: true, backend: 'process' });
  });

  it('Lua script is atomic check-and-incr and key is per-window', () => {
    expect(BUDGET_LUA).toContain('INCRBY');
    expect(BUDGET_LUA).toContain('PEXPIRE');
    expect(budgetKey('t', 0, 60_000)).toBe('ai:budget:t:0');
    expect(budgetKey('t', 120_000, 60_000)).toBe('ai:budget:t:2');
  });
});
