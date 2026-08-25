import { describe, expect, it } from 'vitest';

import { quizCreateBaseSchema } from '@/lib/quizSchemas';

const validQuestion = {
  type: 'TRUE_FALSE' as const,
  question: 'Is the window required?',
  points: 1,
  order: 0,
  correctAnswer: 'true',
};

const base = {
  title: 'Chapter 2',
  sectionIds: ['section-1'],
  maxAttempts: 1,
  passingScore: 60,
  questions: [validQuestion],
};

describe('quizCreateBaseSchema window', () => {
  it('rejects a quiz without start and end dates', () => {
    const result = quizCreateBaseSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it('rejects an end that is not after the start', () => {
    const result = quizCreateBaseSchema.safeParse({
      ...base,
      startDate: '2026-09-02T18:00:00.000Z',
      endDate: '2026-09-02T18:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a quiz with a start before the due date', () => {
    const result = quizCreateBaseSchema.safeParse({
      ...base,
      startDate: '2026-09-01T14:00:00.000Z',
      endDate: '2026-09-08T23:59:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
