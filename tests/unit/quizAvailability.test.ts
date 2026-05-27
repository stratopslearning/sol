import { describe, expect, it } from 'vitest';

import { getQuizAvailability } from '@/lib/quizAvailability';

describe('getQuizAvailability', () => {
  const now = new Date('2026-06-15T18:00:00.000Z');

  it('blocks before start and after quiz endDate', () => {
    expect(
      getQuizAvailability(
        {
          startDate: '2026-06-16T00:00:00.000Z',
          endDate: '2026-06-20T00:00:00.000Z',
        },
        { dueDate: null },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'quizNotStarted' });

    expect(
      getQuizAvailability(
        {
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-10T00:00:00.000Z',
        },
        { dueDate: null },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'quizEnded' });
  });

  it('uses assignment dueDate only when quiz endDate is unset', () => {
    expect(
      getQuizAvailability(
        { startDate: null, endDate: null },
        { dueDate: '2026-06-10T00:00:00.000Z' },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'dueDatePassed' });

    expect(
      getQuizAvailability(
        { startDate: null, endDate: '2026-06-20T00:00:00.000Z' },
        { dueDate: '2026-06-10T00:00:00.000Z' },
        now,
      ),
    ).toEqual({ allowed: true });
  });
});
