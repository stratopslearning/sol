/** Insights analyst fixtures — pre-aggregated anonymous stats only. */

export type InsightsEvalCase = {
  id: string;
  kMin: number;
  criterionMissRates: Array<{
    questionId: string;
    criterionId: string;
    missRate: number;
    partialRate: number;
    n: number;
  }>;
  struggleTopicCounts: Array<{ topic: string; count: number }>;
  cappedExcerpts: string[];
  expectMinMisconceptions: number;
  expectMinSuggestions: number;
};

export const INSIGHTS_EVAL_DATASET: InsightsEvalCase[] = [
  {
    id: 'insights-lead-time-cluster',
    kMin: 5,
    criterionMissRates: [
      {
        questionId: 'q-lead',
        criterionId: 'c-order-to-delivery',
        missRate: 0.62,
        partialRate: 0.2,
        n: 24,
      },
      {
        questionId: 'q-eoq',
        criterionId: 'c-tradeoff',
        missRate: 0.48,
        partialRate: 0.25,
        n: 24,
      },
    ],
    struggleTopicCounts: [
      { topic: 'lead time vs cycle time', count: 11 },
      { topic: 'EOQ assumptions', count: 8 },
    ],
    cappedExcerpts: [
      'Students confuse lead time with manufacturing cycle time.',
      'Many omit holding-cost side of the EOQ tradeoff.',
    ],
    expectMinMisconceptions: 1,
    expectMinSuggestions: 1,
  },
];
