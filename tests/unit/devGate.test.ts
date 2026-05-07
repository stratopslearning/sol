/**
 * The dev-only gate must:
 *   - Allow everyone in non-production.
 *   - Deny everyone but ADMINs in production (with 404 to hide existence).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getOrCreateUser = vi.fn();

vi.mock('@/lib/getOrCreateUser', () => ({
  getOrCreateUser: () => getOrCreateUser(),
}));

beforeEach(() => {
  getOrCreateUser.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('assertDevOrAdmin', () => {
  it('allows all callers in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { assertDevOrAdmin } = await import('@/lib/devGate');
    const result = await assertDevOrAdmin();
    expect(result).toBeNull();
    expect(getOrCreateUser).not.toHaveBeenCalled();
  });

  it('returns 404 in production for unauthenticated callers', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    getOrCreateUser.mockResolvedValueOnce(null);
    const { assertDevOrAdmin } = await import('@/lib/devGate');
    const result = await assertDevOrAdmin();
    expect(result?.status).toBe(404);
  });

  it('returns 404 in production for non-admin users', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    getOrCreateUser.mockResolvedValueOnce({ id: 'u1', role: 'STUDENT' });
    const { assertDevOrAdmin } = await import('@/lib/devGate');
    const result = await assertDevOrAdmin();
    expect(result?.status).toBe(404);
  });

  it('allows admins in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    getOrCreateUser.mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' });
    const { assertDevOrAdmin } = await import('@/lib/devGate');
    const result = await assertDevOrAdmin();
    expect(result).toBeNull();
  });
});
