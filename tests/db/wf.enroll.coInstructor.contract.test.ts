/**
 * Professor join codes must not mint co_instructor (product rule).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('wf.enroll.coInstructor.contract', () => {
  it('professor enroll route does not bind co_instructor', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/professor/enroll/route.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/co_instructor/);
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
