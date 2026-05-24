import { describe, expect, it } from 'vitest';

import {
  FALLBACK_FEEDBACK_SNIPPET,
  isFallbackGradingFeedback,
} from '@/lib/regradeAttempt';

describe('isFallbackGradingFeedback', () => {
  it('detects the fallback feedback message', () => {
    expect(
      isFallbackGradingFeedback({
        score: 0,
        feedback: `${FALLBACK_FEEDBACK_SNIPPET}. Your answer has been recorded.`,
        confidence: 30,
      }),
    ).toBe(true);
  });

  it('returns false for normal AI feedback', () => {
    expect(
      isFallbackGradingFeedback({
        score: 2,
        feedback: 'You correctly identified all four categories.',
        confidence: 85,
      }),
    ).toBe(false);
  });
});
