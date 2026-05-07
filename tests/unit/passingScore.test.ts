/**
 * Tests for the pass/fail computation that lives inline in the submit
 * route. We extract the predicate here for direct verification — it must:
 *   - Return false when maxScore is 0 (avoid division-by-zero false-pass).
 *   - Round percentage before comparing against the threshold.
 *   - Use the configured passingScore, not hard-code 60.
 */
import { describe, expect, it } from 'vitest';

function computePassed(args: {
  totalScore: number;
  maxScore: number;
  passingScore: number;
}) {
  const { totalScore, maxScore, passingScore } = args;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = maxScore > 0 ? percentage >= passingScore : false;
  return { percentage, passed };
}

describe('passing score logic', () => {
  it('passes when at the threshold', () => {
    expect(computePassed({ totalScore: 6, maxScore: 10, passingScore: 60 }).passed).toBe(true);
  });
  it('fails when below', () => {
    expect(computePassed({ totalScore: 5, maxScore: 10, passingScore: 60 }).passed).toBe(false);
  });
  it('returns false when maxScore is 0', () => {
    const r = computePassed({ totalScore: 0, maxScore: 0, passingScore: 60 });
    expect(r.passed).toBe(false);
    expect(r.percentage).toBe(0);
  });
  it('respects a custom passing score', () => {
    expect(computePassed({ totalScore: 8, maxScore: 10, passingScore: 90 }).passed).toBe(false);
    expect(computePassed({ totalScore: 9, maxScore: 10, passingScore: 90 }).passed).toBe(true);
  });
  it('handles 100% threshold', () => {
    expect(computePassed({ totalScore: 10, maxScore: 10, passingScore: 100 }).passed).toBe(true);
    expect(computePassed({ totalScore: 9, maxScore: 10, passingScore: 100 }).passed).toBe(false);
  });
});
