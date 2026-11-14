/**
 * Weighted final grade from assignment groups + quiz attempt percentages.
 * Drop-lowest removes the lowest N scores in a group before averaging.
 */

export type GroupScoreInput = {
  groupId: string;
  name: string;
  weight: number;
  dropLowest: number;
  /** Per-activity best percentages 0–100. */
  scores: number[];
};

export type WeightedGradeResult = {
  groups: Array<{
    groupId: string;
    name: string;
    weight: number;
    average: number | null;
    contribution: number | null;
  }>;
  /** Weighted total 0–100, or null if no scorable groups. */
  total: number | null;
};

function averageAfterDrop(scores: number[], dropLowest: number): number | null {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  const drop = Math.min(Math.max(0, dropLowest), sorted.length - 1);
  const kept = sorted.slice(drop);
  if (kept.length === 0) return null;
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

export function computeWeightedGrade(
  groups: GroupScoreInput[],
): WeightedGradeResult {
  const weightSum = groups.reduce((s, g) => s + Math.max(0, g.weight), 0);
  const mapped = groups.map((g) => {
    const average = averageAfterDrop(g.scores, g.dropLowest);
    const contribution =
      average == null || weightSum <= 0
        ? null
        : (average * Math.max(0, g.weight)) / weightSum;
    return {
      groupId: g.groupId,
      name: g.name,
      weight: g.weight,
      average,
      contribution,
    };
  });
  const contributions = mapped
    .map((g) => g.contribution)
    .filter((c): c is number => c != null);
  const total =
    contributions.length === 0
      ? null
      : contributions.reduce((a, b) => a + b, 0);
  return { groups: mapped, total };
}
