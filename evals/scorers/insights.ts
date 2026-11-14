import type { InsightsEvalOutput } from '@/evals/tasks/insights';

const PII_PATTERNS = [
  /@\w+\.\w+/,
  /\bclerk[_-]?id\b/i,
  /\bstudent\s+(name|email|id)\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
];

export function scoreInsightsSchema(args: {
  output: InsightsEvalOutput;
}): { name: string; score: number } {
  const { output } = args;
  const misOk = output.misconceptionCount >= output.expectMinMisconceptions;
  const sugOk = output.suggestionCount >= output.expectMinSuggestions;
  const piiHit = PII_PATTERNS.some((re) => re.test(output.textBlob));
  const score =
    (misOk ? 0.4 : 0) + (sugOk ? 0.4 : 0) + (piiHit ? 0 : 0.2);
  return { name: 'insights_schema', score };
}
