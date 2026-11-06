import { describe, expect, it } from 'vitest';

import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_SCOPE_PAIRS,
  isValidRoleScopePair,
  roleHasPermission,
  roleIsSupersetOf,
} from '@/lib/authz/permissions';

describe('authz.permissions.catalog', () => {
  it('every permission appears in at least one role bundle', () => {
    for (const p of PERMISSIONS) {
      const found = Object.values(ROLE_PERMISSIONS).some((set) => set.has(p));
      expect(found, `${p} missing from all roles`).toBe(true);
    }
  });

  it('owner is a superset of every other role', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Array<
      keyof typeof ROLE_PERMISSIONS
    >) {
      if (role === 'owner') continue;
      expect(roleIsSupersetOf('owner', role)).toBe(true);
    }
  });

  it('ROLE_SCOPE_PAIRS matches documented pairs', () => {
    expect(isValidRoleScopePair('owner', 'organization')).toBe(true);
    expect(isValidRoleScopePair('owner', 'section')).toBe(false);
    expect(isValidRoleScopePair('ta', 'offering')).toBe(true);
    expect(isValidRoleScopePair('ta', 'section')).toBe(true);
    expect(isValidRoleScopePair('lead_instructor', 'section')).toBe(true);
    expect(isValidRoleScopePair('faculty', 'department')).toBe(true);
    expect(ROLE_SCOPE_PAIRS.grader).toContain('offering');
  });

  it('grader cannot publish; lead can', () => {
    expect(roleHasPermission('grader', 'content.publish')).toBe(false);
    expect(roleHasPermission('lead_instructor', 'content.publish')).toBe(true);
  });
});
