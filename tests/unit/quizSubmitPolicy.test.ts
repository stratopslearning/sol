import { describe, expect, it } from 'vitest';

import { assertQuizSubmitWindow } from '@/lib/quizSubmitPolicy';

describe('assertQuizSubmitWindow', () => {
  const startedAt = new Date('2026-01-01T12:00:00.000Z');

  it('rejects past end date when bypassAvailability is false (client autoSubmitted path)', () => {
    expect(() =>
      assertQuizSubmitWindow({
        bypassAvailability: false,
        quiz: { endDate: '2026-01-01T13:00:00.000Z', timeLimit: 60 },
        assignment: { dueDate: null },
        attemptStartTime: startedAt,
        submitTime: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ).toThrow(/has ended/);
  });

  it('allows past end date when bypassAvailability is true (server auto-submit)', () => {
    expect(() =>
      assertQuizSubmitWindow({
        bypassAvailability: true,
        quiz: { endDate: '2026-01-01T13:00:00.000Z', timeLimit: 60 },
        assignment: { dueDate: null },
        attemptStartTime: startedAt,
        submitTime: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ).not.toThrow();
  });

  it('rejects time limit exceeded without bypass', () => {
    expect(() =>
      assertQuizSubmitWindow({
        bypassAvailability: false,
        quiz: { endDate: null, timeLimit: 30 },
        assignment: { dueDate: null },
        attemptStartTime: startedAt,
        submitTime: new Date(startedAt.getTime() + 45 * 60 * 1000),
      }),
    ).toThrow(/Time limit exceeded/);
  });

  it('allows time limit exceeded with server bypass', () => {
    expect(() =>
      assertQuizSubmitWindow({
        bypassAvailability: true,
        quiz: { endDate: null, timeLimit: 30 },
        assignment: { dueDate: null },
        attemptStartTime: startedAt,
        submitTime: new Date(startedAt.getTime() + 45 * 60 * 1000),
      }),
    ).not.toThrow();
  });
});
