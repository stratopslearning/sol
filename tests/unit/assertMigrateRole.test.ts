import { describe, expect, it } from 'vitest';

import { assertMigrateRole } from '../../scripts/lib/assertMigrateRole';

describe('assertMigrateRole', () => {
  it('refuses sol_app', () => {
    expect(() =>
      assertMigrateRole('postgres://sol_app:x@ep-test.neon.tech/neondb'),
    ).toThrow(/sol_app/);
  });

  it('allows sol_migrator', () => {
    expect(
      assertMigrateRole('postgres://sol_migrator:x@ep-test.neon.tech/neondb'),
    ).toBe('sol_migrator');
  });

  it('refuses owner without ALLOW_OWNER_MIGRATE', () => {
    const prev = process.env.ALLOW_OWNER_MIGRATE;
    delete process.env.ALLOW_OWNER_MIGRATE;
    try {
      expect(() =>
        assertMigrateRole('postgres://neondb_owner:x@ep-test.neon.tech/neondb'),
      ).toThrow(/owner/);
    } finally {
      if (prev !== undefined) process.env.ALLOW_OWNER_MIGRATE = prev;
    }
  });
});
