import { describe, expect, it } from 'vitest';

import { clipLessonsContextForTest } from '@/lib/learning/tutorContext';
import { assembleSystemPrompt } from '@/lib/chatbot/safeQuizContext';

describe('clipLessonsContextForTest', () => {
  it('returns empty for no lessons', () => {
    expect(clipLessonsContextForTest([])).toBe('');
  });

  it('includes LEARNING MODE header and respects budget', () => {
    const ctx = clipLessonsContextForTest(
      [
        {
          title: 'Photosynthesis',
          markdown: 'Plants convert light to energy. '.repeat(80),
        },
        {
          title: 'Respiration',
          markdown: 'Cells release energy. '.repeat(80),
        },
      ],
      500,
    );
    expect(ctx).toContain('Released lesson context');
    expect(ctx).toContain('Photosynthesis');
    expect(ctx.length).toBeLessThanOrEqual(520);
  });
});

describe('assembleSystemPrompt with lessons', () => {
  it('appends lessons context after materials', () => {
    const system = assembleSystemPrompt(
      'Coach kindly.',
      '',
      'Materials block',
      'Lessons block',
    );
    expect(system).toContain('Materials block');
    expect(system).toContain('Lessons block');
    expect(system.indexOf('Materials block')).toBeLessThan(
      system.indexOf('Lessons block'),
    );
  });
});
