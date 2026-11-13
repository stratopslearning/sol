import { describe, expect, it } from 'vitest';

import { roleGrantsWorkspaceFacultyAccess } from '@/lib/knowledge/workspaceAccess';

describe('roleGrantsWorkspaceFacultyAccess', () => {
  it('allows section co-instructors (faculty join code)', () => {
    expect(roleGrantsWorkspaceFacultyAccess('co_instructor')).toBe(true);
  });

  it('allows lead instructors and org faculty', () => {
    expect(roleGrantsWorkspaceFacultyAccess('lead_instructor')).toBe(true);
    expect(roleGrantsWorkspaceFacultyAccess('faculty')).toBe(true);
    expect(roleGrantsWorkspaceFacultyAccess('owner')).toBe(true);
    expect(roleGrantsWorkspaceFacultyAccess('admin')).toBe(true);
  });

  it('allows TAs/graders via content.read', () => {
    expect(roleGrantsWorkspaceFacultyAccess('ta')).toBe(true);
    expect(roleGrantsWorkspaceFacultyAccess('grader')).toBe(true);
  });
});
