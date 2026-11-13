import { describe, expect, it } from 'vitest';

import { GRADING_EVAL_DATASET } from '../../evals/datasets/grading';

/**
 * Lightweight CI guard: golden grading eval set stays populated and shaped.
 * Full LLM scoring runs in .github/workflows/evals.yml (npm run eval).
 */
describe('GRADING_EVAL_DATASET shape', () => {
  it('is non-empty', () => {
    expect(GRADING_EVAL_DATASET.length).toBeGreaterThan(0);
  });

  it('each case has required fields', () => {
    for (const row of GRADING_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.question).toBeTruthy();
      expect(row.studentAnswer).toBeTruthy();
      expect(row.maxPoints).toBeGreaterThan(0);
      expect(row.rubric?.length).toBeGreaterThan(0);
      expect(row.expectedBand.minFrac).toBeGreaterThanOrEqual(0);
      expect(row.expectedBand.maxFrac).toBeLessThanOrEqual(1);
      expect(row.expectedBand.minFrac).toBeLessThanOrEqual(
        row.expectedBand.maxFrac,
      );
    }
  });
});
