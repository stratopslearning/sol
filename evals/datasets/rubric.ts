/** Rubric designer golden cases (synthetic; no live student data). */

export type RubricEvalCase = {
  id: string;
  question: string;
  correctAnswer: string;
  minCriteria: number;
  maxCriteria: number;
};

export const RUBRIC_EVAL_DATASET: RubricEvalCase[] = [
  {
    id: 'rubric-lead-time',
    question: 'Define lead time in inventory management.',
    correctAnswer: 'Time from placing an order until the goods are received.',
    minCriteria: 2,
    maxCriteria: 6,
  },
  {
    id: 'rubric-eoq',
    question: 'What is EOQ and what tradeoff does it balance?',
    correctAnswer:
      'Economic order quantity balances ordering cost against holding cost.',
    minCriteria: 2,
    maxCriteria: 6,
  },
  {
    id: 'rubric-safety-stock',
    question: 'Explain safety stock and when to increase it.',
    correctAnswer:
      'Extra inventory held against demand or lead-time uncertainty; increase when variability or service level rises.',
    minCriteria: 2,
    maxCriteria: 6,
  },
];
