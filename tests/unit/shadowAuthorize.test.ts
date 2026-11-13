import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authorizeMock = vi.fn();
vi.mock('@/lib/authz/authorize', () => ({
  authorize: (...a: unknown[]) => authorizeMock(...a),
}));

import {
  legacyHasTeachingRole,
  setShadowSink,
  shadowAuthorize,
  shadowCompare,
  type ShadowEvent,
} from '@/lib/authz/shadowAuthorize';

const user = { id: 'u1' as const };
const resource = { tenantId: 't1', scopeType: 'section' as const, scopeId: 's1' };

describe('shadowAuthorize', () => {
  const events: ShadowEvent[] = [];
  beforeEach(() => {
    events.length = 0;
    authorizeMock.mockReset();
    setShadowSink((e) => events.push(e));
    delete process.env.SHADOW_AUTHZ;
  });
  afterEach(() => setShadowSink(null));

  it('returns the LEGACY answer and logs nothing when they agree', async () => {
    authorizeMock.mockResolvedValue(true);
    const r = await shadowAuthorize({
      site: 't', user, permission: 'content.read', resource, legacy: true,
    });
    expect(r).toBe(true);
    expect(events).toHaveLength(0);
  });

  it('returns legacy and logs a mismatch when authorize() disagrees', async () => {
    authorizeMock.mockResolvedValue(false);
    const r = await shadowAuthorize({
      site: 'site-a', user, permission: 'content.read', resource, legacy: true,
    });
    expect(r).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'authz.shadow_mismatch', site: 'site-a', legacy: true, next: false,
    });
  });

  it('never throws: authorize() errors become authz.shadow_error', async () => {
    authorizeMock.mockRejectedValue(new Error('boom'));
    const r = await shadowAuthorize({
      site: 'x', user, permission: 'content.read', resource, legacy: false,
    });
    expect(r).toBe(false);
    expect(events[0]).toMatchObject({ event: 'authz.shadow_error', error: 'boom' });
  });

  it('SHADOW_AUTHZ=0 skips the new path entirely', async () => {
    process.env.SHADOW_AUTHZ = '0';
    const r = await shadowAuthorize({
      site: 'x', user, permission: 'content.read', resource, legacy: true,
    });
    expect(r).toBe(true);
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it('shadowCompare logs on disagreement and returns legacy', async () => {
    const r = await shadowCompare({
      site: 'g', userId: 'u1', label: 'teaching', legacy: false, next: () => true,
    });
    expect(r).toBe(false);
    expect(events[0]).toMatchObject({ permission: 'teaching', legacy: false, next: true });
  });

  it('legacyHasTeachingRole (users.role dropped — only platformStaff / optional legacy role)', () => {
    expect(legacyHasTeachingRole({ id: 'a' })).toBe(false);
    expect(legacyHasTeachingRole({ id: 'a', role: 'STUDENT' })).toBe(false);
    expect(legacyHasTeachingRole({ id: 'a', role: 'PROFESSOR' })).toBe(true);
    expect(legacyHasTeachingRole({ id: 'a', role: 'ADMIN' })).toBe(true);
    expect(legacyHasTeachingRole({ id: 'a', platformStaff: true })).toBe(true);
  });
});
