import { describe, expect, it } from 'vitest';

import {
  analyzeBindingConflicts,
  reportHasBlockingIssues,
  type BindingRow,
} from '@/lib/authz/bindingConflicts';
import {
  isValidRoleScopePair,
  roleIsSupersetOf,
} from '@/lib/authz/permissions';

let n = 0;
const row = (over: Partial<BindingRow>): BindingRow => ({
  id: `b${++n}`,
  tenantId: 't1',
  userId: 'u1',
  scopeType: 'section',
  scopeId: 's1',
  role: 'ta',
  ...over,
});

describe('role/scope pairs', () => {
  it('accepts valid and rejects invalid pairs', () => {
    expect(isValidRoleScopePair('owner', 'organization')).toBe(true);
    expect(isValidRoleScopePair('owner', 'section')).toBe(false);
    expect(isValidRoleScopePair('ta', 'organization')).toBe(false);
    expect(isValidRoleScopePair('lead_instructor', 'offering')).toBe(true);
    expect(isValidRoleScopePair('learner', 'section')).toBe(false);
  });

  it('computes permission supersets', () => {
    expect(roleIsSupersetOf('lead_instructor', 'ta')).toBe(true);
    expect(roleIsSupersetOf('ta', 'lead_instructor')).toBe(false);
    expect(roleIsSupersetOf('co_instructor', 'grader')).toBe(true);
  });
});

describe('analyzeBindingConflicts', () => {
  it('auto-resolves strict permission supersets', () => {
    const lead = row({ role: 'lead_instructor' });
    const ta = row({ role: 'ta' });
    const report = analyzeBindingConflicts([lead, ta]);
    expect(report.manual).toHaveLength(0);
    expect(report.autoResolvable).toHaveLength(1);
    expect(report.autoResolvable[0]!.keep?.id).toBe(lead.id);
    expect(report.autoResolvable[0]!.revoke.map((r) => r.id)).toEqual([ta.id]);
    expect(reportHasBlockingIssues(report)).toBe(false);
  });

  it('flags non-superset conflicts as manual and blocking', () => {
    // admin (org) vs faculty (org): admin lacks content.read -> not a superset of faculty
    const report = analyzeBindingConflicts([
      row({ role: 'admin', scopeType: 'organization', scopeId: 'o1' }),
      row({ role: 'faculty', scopeType: 'organization', scopeId: 'o1' }),
    ]);
    expect(report.manual).toHaveLength(1);
    expect(reportHasBlockingIssues(report)).toBe(true);
  });

  it('flags invalid pairs', () => {
    const report = analyzeBindingConflicts([
      row({ role: 'owner', scopeType: 'section' }),
    ]);
    expect(report.invalidPairs).toHaveLength(1);
    expect(reportHasBlockingIssues(report)).toBe(true);
  });

  it('ignores different scopes and users', () => {
    const report = analyzeBindingConflicts([
      row({ scopeId: 's1' }),
      row({ scopeId: 's2' }),
      row({ userId: 'u2' }),
    ]);
    expect(report.autoResolvable).toHaveLength(0);
    expect(report.manual).toHaveLength(0);
  });
});
