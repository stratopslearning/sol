import { describe, expect, it } from 'vitest';

import {
  extractStruggleTopics,
  NOT_IN_MATERIALS_REPLY,
} from '@/lib/chatbot/assessmentLock';

describe('assessmentLock helpers', () => {
  it('extracts struggle topics', () => {
    expect(
      extractStruggleTopics("I'm confused about the definition of EOQ"),
    ).toEqual(expect.arrayContaining(['confusion', 'definitions']));
  });

  it('exposes not-in-materials copy', () => {
    expect(NOT_IN_MATERIALS_REPLY.toLowerCase()).toContain('course materials');
  });
});
