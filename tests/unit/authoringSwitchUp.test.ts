import { describe, expect, it } from 'vitest';

import {
  itemBodySimilarity,
  textSimilarity,
} from '@/lib/authoring/switchUp';

describe('textSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(textSimilarity('hello world quiz', 'hello world quiz')).toBe(1);
  });

  it('returns low score for unrelated stems', () => {
    const s = textSimilarity(
      'What is the capital of France?',
      'Derive the derivative of x squared',
    );
    expect(s).toBeLessThan(0.3);
  });
});

describe('itemBodySimilarity', () => {
  it('flags near-duplicate quiz bodies', () => {
    const a = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'What is photosynthesis primarily powered by?',
          options: ['Sunlight', 'Moonlight'],
          correctAnswer: 'Sunlight',
          conceptTags: ['photosynthesis'],
        },
      ],
    };
    const b = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'What is photosynthesis primarily powered by?',
          options: ['Sunlight', 'Moonlight'],
          correctAnswer: 'Sunlight',
          conceptTags: ['photosynthesis'],
        },
      ],
    };
    expect(itemBodySimilarity(a, b)).toBeGreaterThan(0.9);
  });
});
