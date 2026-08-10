import { describe, expect, it } from 'vitest';

import {
  buildQuizDescriptionWithMetadata,
  cleanQuizDescription,
  extractQuizMetadata,
} from '@/lib/utils';

describe('quiz description metadata helpers', () => {
  it('strips metadata regardless of leading newlines', () => {
    const raw =
      'Course overview\n<!-- QUIZ_METADATA: {"hideFeedbackAfterDue":true} -->';
    expect(cleanQuizDescription(raw)).toBe('Course overview');
  });

  it('strips duplicated metadata blocks left by older saves', () => {
    const raw = [
      'Syllabus unit 2',
      '<!-- QUIZ_METADATA: {"hideFeedbackAfterDue":false} -->',
      '',
      '<!-- QUIZ_METADATA: {"hideFeedbackAfterDue":true} -->',
    ].join('\n');
    expect(cleanQuizDescription(raw)).toBe('Syllabus unit 2');
  });

  it('only embeds metadata when hide-feedback is enabled', () => {
    expect(buildQuizDescriptionWithMetadata('Hello', false)).toBe('Hello');
    expect(buildQuizDescriptionWithMetadata('Hello', true)).toContain(
      'QUIZ_METADATA',
    );
    expect(
      extractQuizMetadata(buildQuizDescriptionWithMetadata('Hello', true))
        .hideFeedbackAfterDue,
    ).toBe(true);
  });
});
