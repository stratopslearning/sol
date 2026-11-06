import { describe, expect, it } from 'vitest';

import { intersectScopesWithRoles } from '@/lib/authz/tokenScopes';

const ALL = [
  'read',
  'sections:write',
  'quizzes:write',
  'grades:write',
  'discussions:write',
  'materials:write',
  'authoring:write',
] as const;

describe('intersectScopesWithRoles (token ∩ bindings)', () => {
  it('grader keeps only read + grades:write', () => {
    expect(intersectScopesWithRoles(ALL, ['grader'])).toEqual([
      'read',
      'grades:write',
    ]);
  });

  it('lead instructor keeps content, grading, materials', () => {
    const out = intersectScopesWithRoles(ALL, ['lead_instructor']);
    expect(out).toContain('quizzes:write');
    expect(out).toContain('grades:write');
    expect(out).toContain('materials:write');
    expect(out).toContain('sections:write');
  });

  it('no bindings → no scopes (token cannot exceed user)', () => {
    expect(intersectScopesWithRoles(ALL, [])).toEqual([]);
  });

  it('never widens beyond the token scopes', () => {
    expect(intersectScopesWithRoles(['read'], ['owner'])).toEqual(['read']);
  });

  it('admin has no content.write, so cannot author quizzes via token', () => {
    const out = intersectScopesWithRoles(ALL, ['admin']);
    expect(out).not.toContain('quizzes:write');
    expect(out).not.toContain('grades:write');
  });
});
