import { describe, expect, it } from 'vitest';

import { mapClerkSessionEvent } from '@/lib/clerkWebhook';

describe('mapClerkSessionEvent', () => {
  it('maps session.created to auth.session.create', () => {
    expect(mapClerkSessionEvent('session.created')).toBe('auth.session.create');
  });

  it('maps end/revoke/remove/signed_out to auth.session.end', () => {
    expect(mapClerkSessionEvent('session.ended')).toBe('auth.session.end');
    expect(mapClerkSessionEvent('session.revoked')).toBe('auth.session.end');
    expect(mapClerkSessionEvent('session.removed')).toBe('auth.session.end');
    expect(mapClerkSessionEvent('user.signed_out')).toBe('auth.session.end');
  });

  it('ignores unrelated event types', () => {
    expect(mapClerkSessionEvent('user.created')).toBeNull();
    expect(mapClerkSessionEvent('email.created')).toBeNull();
  });
});
