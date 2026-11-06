import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.fn();

vi.mock('@/app/db', () => ({
  db: { execute },
}));

describe('assertRuntimeRole', () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function load() {
    const mod = await import('@/lib/db/assertRuntimeRole');
    mod.clearRuntimeRoleCache();
    return mod;
  }

  function mockRow(partial: Record<string, unknown>) {
    execute.mockResolvedValue({
      rows: [
        {
          current_user: 'sol_app',
          rolbypassrls: false,
          owns_table: false,
          member_of_owner: false,
          owner_role: null,
          ...partial,
        },
      ],
    });
  }

  it('accepts sol_app without bypass/ownership/membership', async () => {
    mockRow({});
    const mod = await load();
    const first = await mod.assertRuntimeRole();
    expect(first).toEqual({
      ok: true,
      currentUser: 'sol_app',
      rolbypassrls: false,
    });
    // Second call hits process cache (no second query).
    await mod.assertRuntimeRole();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('rejects rolbypassrls', async () => {
    mockRow({ rolbypassrls: true, current_user: 'neondb_owner' });
    const mod = await load();
    const result = await mod.assertRuntimeRole();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not allowed for app\/worker|rolbypassrls/);
    }
  });

  it('rejects table ownership', async () => {
    mockRow({ owns_table: true });
    const mod = await load();
    const result = await mod.assertRuntimeRole();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/owns one or more/);
  });

  it('rejects MEMBER of a table owner role', async () => {
    mockRow({ member_of_owner: true, owner_role: 'neondb_owner' });
    const mod = await load();
    const result = await mod.assertRuntimeRole();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/MEMBER of table owner/);
  });

  it('requireSafeRuntimeRole throws RuntimeRoleError', async () => {
    mockRow({ owns_table: true });
    const mod = await load();
    await expect(mod.requireSafeRuntimeRole()).rejects.toMatchObject({
      name: 'RuntimeRoleError',
    });
  });
});
