import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/db', () => ({ db: { query: {} } }));

import { isOfferingEnded } from '@/lib/offerings/lifecycle';

const now = new Date('2026-06-01T00:00:00Z');

describe('isOfferingEnded', () => {
  it('active with no end date is writable', () => {
    expect(isOfferingEnded({ status: 'active', endsAt: null }, now)).toBe(false);
  });
  it('ended / archived statuses are read-only', () => {
    expect(isOfferingEnded({ status: 'ended' }, now)).toBe(true);
    expect(isOfferingEnded({ status: 'archived' }, now)).toBe(true);
  });
  it('past endsAt is read-only even when status is active', () => {
    expect(isOfferingEnded({ status: 'active', endsAt: '2026-05-31T00:00:00Z' }, now)).toBe(true);
  });
  it('future endsAt is writable', () => {
    expect(isOfferingEnded({ status: 'active', endsAt: '2026-06-02T00:00:00Z' }, now)).toBe(false);
  });
  it('missing offering is not ended', () => {
    expect(isOfferingEnded(null, now)).toBe(false);
  });
});
