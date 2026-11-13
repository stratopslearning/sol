/** Golden cases for authoring build / switch-up / reviewer (synthetic). */

export type AuthoringBuildCase = {
  id: string;
  body: {
    questions?: Array<{
      type: string;
      question: string;
      correctAnswer?: string;
      rubric?: unknown[];
      sourceCitations?: unknown[];
    }>;
    sourceCitations?: unknown[];
  };
  sourceMaterialIds: string[];
  expectHasRubric: boolean;
  expectHasCitation: boolean;
};

export const AUTHORING_BUILD_EVAL_DATASET: AuthoringBuildCase[] = [
  {
    id: 'build-with-rubric-cite',
    body: {
      questions: [
        {
          type: 'SHORT_ANSWER',
          question: 'Define lead time',
          correctAnswer: 'Time from order to delivery',
          rubric: [
            { id: 'c1', description: 'Mentions order-to-delivery', weight: 1 },
          ],
          sourceCitations: [{ materialId: 'm1', quote: 'lead time' }],
        },
      ],
    },
    sourceMaterialIds: ['m1'],
    expectHasRubric: true,
    expectHasCitation: true,
  },
  {
    id: 'build-missing-source',
    body: {
      questions: [
        {
          type: 'SHORT_ANSWER',
          question: 'What is EOQ?',
          correctAnswer: 'Economic order quantity',
        },
      ],
    },
    sourceMaterialIds: [],
    expectHasRubric: false,
    expectHasCitation: false,
  },
  {
    id: 'live-build-quiz-body',
    body: { questions: [] },
    sourceMaterialIds: ['m1'],
    expectHasRubric: true,
    expectHasCitation: true,
  },
];

export type SwitchUpEvalCase = {
  id: string;
  before: {
    questions: Array<{
      type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
      question: string;
      options?: string[];
      correctAnswer: string;
    }>;
  };
  after: {
    questions: Array<{
      type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
      question: string;
      options?: string[];
      correctAnswer: string;
    }>;
  };
  expectOk: boolean;
};

export const SWITCH_UP_EVAL_DATASET: SwitchUpEvalCase[] = [
  {
    id: 'switch-keys-changed',
    before: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Capital of France?',
          options: ['Paris', 'Lyon'],
          correctAnswer: 'Paris',
        },
      ],
    },
    after: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Which city is the French capital?',
          options: ['Marseille', 'Paris'],
          correctAnswer: 'Paris',
        },
      ],
    },
    // Original key "Paris" still in options → should fail validation
    expectOk: false,
  },
  {
    id: 'switch-keys-remapped',
    before: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: '2+2?',
          options: ['3', '4'],
          correctAnswer: '4',
        },
      ],
    },
    after: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'What is three plus one?',
          options: ['five', 'four'],
          correctAnswer: 'four',
        },
      ],
    },
    expectOk: true,
  },
  {
    id: 'live-switch-capital',
    before: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Capital of France?',
          options: ['Paris', 'Lyon'],
          correctAnswer: 'Paris',
        },
      ],
    },
    after: {
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Capital of France?',
          options: ['Paris', 'Lyon'],
          correctAnswer: 'Paris',
        },
      ],
    },
    expectOk: true,
  },
];

export type ReviewerEvalCase = {
  id: string;
  body: {
    questions: Array<{
      type: string;
      question: string;
      correctAnswer?: string;
      rubric?: unknown[];
    }>;
  };
  sourceMaterialIds: string[];
  expectCodes: string[];
};

export const REVIEWER_EVAL_DATASET: ReviewerEvalCase[] = [
  {
    id: 'review-answer-in-stem',
    body: {
      questions: [
        {
          type: 'SHORT_ANSWER',
          question: 'Explain photosynthesis which produces glucose',
          correctAnswer: 'glucose',
        },
      ],
    },
    sourceMaterialIds: [],
    expectCodes: ['answer_leak', 'missing_source'],
  },
];
