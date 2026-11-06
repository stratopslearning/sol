import { describe, expect, it } from 'vitest';

import {
  originalKeysStillWork,
  validateSwitchUpVariant,
} from '@/lib/authoring/switchUpValidate';

describe('switchUpValidate', () => {
  it('flags when original MCQ key remains in options', () => {
    const before = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'Capital?',
          options: ['Paris', 'Lyon'],
          correctAnswer: 'Paris',
        },
      ],
    };
    const after = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'French capital city?',
          options: ['Nice', 'Paris'],
          correctAnswer: 'Paris',
        },
      ],
    };
    expect(originalKeysStillWork(before, after)).toBe(true);
    const check = validateSwitchUpVariant(before, after, 0.2);
    expect(check.ok).toBe(false);
  });

  it('accepts remapped keys', () => {
    const before = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: '2+2?',
          options: ['3', '4'],
          correctAnswer: '4',
        },
      ],
    };
    const after = {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'Three plus one equals?',
          options: ['five', 'four'],
          correctAnswer: 'four',
        },
      ],
    };
    expect(originalKeysStillWork(before, after)).toBe(false);
    const check = validateSwitchUpVariant(before, after, 0.1);
    expect(check.ok).toBe(true);
  });
});
