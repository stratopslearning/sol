import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_K_ANONYMITY_MIN,
  isSuppressed,
  kAnonymityMin,
  suppressConceptRows,
  suppressLessonRows,
} from '@/lib/analytics/kAnonymity';

describe('k-anonymity', () => {
  afterEach(() => {
    delete process.env.ANALYTICS_K_ANONYMITY_MIN;
  });

  it('defaults to 5 and is configurable', () => {
    expect(kAnonymityMin()).toBe(DEFAULT_K_ANONYMITY_MIN);
    expect(DEFAULT_K_ANONYMITY_MIN).toBe(5);
    process.env.ANALYTICS_K_ANONYMITY_MIN = '8';
    expect(kAnonymityMin()).toBe(8);
    process.env.ANALYTICS_K_ANONYMITY_MIN = 'nope';
    expect(kAnonymityMin()).toBe(5);
  });

  it('suppresses n < k, keeps n >= k', () => {
    expect(isSuppressed(4)).toBe(true);
    expect(isSuppressed(5)).toBe(false);
  });

  it('redacts small concept groups', () => {
    const rows = suppressConceptRows([
      { tag: 'a', questionCount: 2, attemptCount: 4, correctCount: 1, successRate: 25, gap: true },
      { tag: 'b', questionCount: 2, attemptCount: 9, correctCount: 9, successRate: 100, gap: false },
    ]);
    expect(rows[0]).toMatchObject({ suppressed: true, successRate: 0, gap: false, attemptCount: 0 });
    expect(rows[1]?.suppressed).toBeUndefined();
    expect(rows[1]?.successRate).toBe(100);
  });

  it('redacts small lesson rosters', () => {
    const rows = suppressLessonRows([
      { lessonId: '1', title: 'L1', rosterCount: 3, neverStarted: 1, started: 1, completed: 1, completionRate: 33 },
    ]);
    expect(rows[0]).toMatchObject({ suppressed: true, completed: 0, rosterCount: 0 });
  });
});
