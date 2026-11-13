import type { RubricEvalOutput } from '@/evals/tasks/rubric';

export function scoreRubricStructure(args: {
  output: RubricEvalOutput;
}): { name: string; score: number } {
  const { output } = args;
  const countOk =
    output.criteriaCount >= output.minCriteria &&
    output.criteriaCount <= output.maxCriteria;
  const score = (countOk ? 0.6 : 0) + (output.hasDescriptions ? 0.4 : 0);
  return { name: 'rubric_structure', score };
}
