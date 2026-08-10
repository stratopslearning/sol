/**
 * Unit tests for AI education-record payload minimization.
 */
import { describe, expect, it } from 'vitest';

import {
  minimizeStudentTextForAi,
  promptContainsProfilePii,
} from '@/lib/ai/minimizeEducationPayload';

describe('minimizeStudentTextForAi', () => {
  it('redacts email addresses', () => {
    expect(
      minimizeStudentTextForAi('Contact me at ada@example.edu for more'),
    ).toBe('Contact me at [REDACTED_EMAIL] for more');
  });

  it('leaves ordinary academic text unchanged', () => {
    const text = 'Quality assurance is process-oriented.';
    expect(minimizeStudentTextForAi(text)).toBe(text);
  });
});

describe('promptContainsProfilePii', () => {
  it('detects clerk id field labels', () => {
    expect(promptContainsProfilePii('user clerkId=abc')).toBe(true);
  });

  it('allows normal grading prompts', () => {
    expect(
      promptContainsProfilePii('STUDENT ANSWER:\nSupply chains matter'),
    ).toBe(false);
  });
});
