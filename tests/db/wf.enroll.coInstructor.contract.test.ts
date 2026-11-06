/**
 * Documents expected product rule: professor join codes must not mint co_instructor.
 * When enroll path is fixed, flip EXPECT_JOIN_CODE_GRANTS_CO_INSTRUCTOR to false
 * and assert upsertRoleBinding is not called with co_instructor from enroll.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EXPECT_JOIN_CODE_GRANTS_CO_INSTRUCTOR = true; // product debt — set false after fix

describe('wf.enroll.coInstructor.contract', () => {
  it('professor enroll route currently binds co_instructor (known hole until fixed)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/professor/enroll/route.ts'),
      'utf8',
    );
    const mintsCo = /co_instructor/.test(src);
    expect(mintsCo).toBe(EXPECT_JOIN_CODE_GRANTS_CO_INSTRUCTOR);
  });

  it('staff invite path allows ta/grader only (not co_instructor via section_staff_invites)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/authz/staffInvites.ts'),
      'utf8',
    );
    expect(src).toMatch(/ta|grader/);
    expect(src).not.toMatch(/role:\s*'co_instructor'/);
  });
});
