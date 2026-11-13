import { describe, expect, it } from 'vitest';

import { computeWeightedGrade } from '@/lib/lms/weightedGrades';

describe('computeWeightedGrade', () => {
  it('weights group averages and drops lowest', () => {
    const result = computeWeightedGrade([
      {
        groupId: 'q',
        name: 'Quizzes',
        weight: 40,
        dropLowest: 1,
        scores: [50, 80, 90],
      },
      {
        groupId: 'e',
        name: 'Exams',
        weight: 60,
        dropLowest: 0,
        scores: [70],
      },
    ]);
    // Quizzes keep 80,90 → avg 85; Exams 70
    // total = 85*0.4 + 70*0.6 = 34 + 42 = 76
    expect(result.groups[0]?.average).toBe(85);
    expect(result.groups[1]?.average).toBe(70);
    expect(result.total).toBeCloseTo(76, 5);
  });

  it('returns null total when no scores', () => {
    const result = computeWeightedGrade([
      { groupId: 'q', name: 'Quizzes', weight: 100, dropLowest: 0, scores: [] },
    ]);
    expect(result.total).toBeNull();
  });
});
