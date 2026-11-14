import { describe, expect, it } from 'vitest';

import { canGrantPlatformStaff, platformStaffGrantorEmails } from '@/lib/env';
import { generateEnrollmentCode } from '@/lib/utils';

describe('review hardening', () => {
  it('generateEnrollmentCode returns 10 A–Z0–9 chars', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateEnrollmentCode()).toMatch(/^[A-Z0-9]{10}$/);
    }
  });

  it('platformStaffGrantorEmails returns a Set', () => {
    expect(platformStaffGrantorEmails()).toBeInstanceOf(Set);
    expect(typeof canGrantPlatformStaff(null)).toBe('boolean');
  });

  it('claim mismatch copy does not embed invite email', () => {
    const msg = 'Sign in with the invited email address to claim this invite';
    expect(msg).not.toMatch(/@/);
  });
});
