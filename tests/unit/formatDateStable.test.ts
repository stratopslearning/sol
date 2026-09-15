import { describe, expect, it } from 'vitest';

import {
  getBrowserTimeZone,
  sanitizeTimeZone,
} from '@/lib/displayTimeZone';
import { formatDateStable, formatDateTimeStable, formatTimeStable } from '@/lib/utils';

describe('formatDateTimeStable', () => {
  it('formats with explicit UTC timezone consistently', () => {
    const iso = '2026-05-18T13:00:00.000Z';
    expect(formatDateTimeStable(iso, 'UTC')).toBe('May 18, 2026, 1:00 PM UTC');
  });

  it('still shows time when the instant is midnight UTC', () => {
    const iso = '2026-05-18T00:00:00.000Z';
    expect(formatDateTimeStable(iso, 'UTC')).toBe('May 18, 2026, 12:00 AM UTC');
  });

  it('renders the same instant in the viewer timezone', () => {
    const iso = '2026-09-16T03:59:00.000Z';
    expect(formatDateTimeStable(iso, 'America/New_York')).toBe(
      'Sep 15, 2026, 11:59 PM EDT',
    );
    expect(formatDateTimeStable(iso, 'America/Los_Angeles')).toBe(
      'Sep 15, 2026, 8:59 PM PDT',
    );
  });

  it('shows Eastern time for Florida, not UTC', () => {
    const utcStored = '2026-09-16T03:59:00.000Z';
    expect(formatDateTimeStable(utcStored, 'UTC')).toBe(
      'Sep 16, 2026, 3:59 AM UTC',
    );
    expect(formatDateTimeStable(utcStored, 'America/New_York')).toBe(
      'Sep 15, 2026, 11:59 PM EDT',
    );
  });
});

describe('formatDateStable', () => {
  it('returns null for missing dates', () => {
    expect(formatDateStable(null)).toBeNull();
  });

  it('formats date in UTC', () => {
    expect(formatDateStable('2026-05-18T13:00:00.000Z', 'UTC')).toBe(
      'May 18, 2026',
    );
  });

  it('uses the viewer calendar date, not UTC', () => {
    expect(
      formatDateStable('2026-09-16T03:59:00.000Z', 'America/New_York'),
    ).toBe('Sep 15, 2026');
  });
});

describe('formatTimeStable', () => {
  it('formats time and zone without the calendar date', () => {
    expect(formatTimeStable('2026-09-16T03:59:00.000Z', 'America/Phoenix')).toBe(
      '8:59 PM MST',
    );
  });
});

describe('displayTimeZone helpers', () => {
  it('rejects invalid IANA names', () => {
    expect(sanitizeTimeZone('Not/AZone')).toBeNull();
    expect(sanitizeTimeZone('America/New_York')).toBe('America/New_York');
  });

  it('resolves a browser timezone', () => {
    expect(sanitizeTimeZone(getBrowserTimeZone())).toBe(getBrowserTimeZone());
  });
});
