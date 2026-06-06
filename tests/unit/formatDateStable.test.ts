import { describe, expect, it } from 'vitest';

import { formatDateStable, formatDateTimeStable } from '@/lib/utils';

describe('formatDateTimeStable', () => {
  it('formats with explicit UTC timezone consistently', () => {
    const iso = '2026-05-18T13:00:00.000Z';
    expect(formatDateTimeStable(iso, 'UTC')).toBe('May 18, 2026, 1:00 PM');
  });

  it('formats date-only when time is midnight UTC', () => {
    const iso = '2026-05-18T00:00:00.000Z';
    expect(formatDateTimeStable(iso, 'UTC')).toBe('May 18, 2026');
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
});
