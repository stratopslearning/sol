/**
 * Soft-delete filter helper. Mostly a smoke test that the helper composes
 * with drizzle's `and` without crashing.
 */
import { describe, expect, it } from 'vitest';
import { and } from 'drizzle-orm';

import { quizzes } from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';

describe('activeOnly', () => {
  it('returns a SQL fragment', () => {
    const fragment = activeOnly(quizzes.deletedAt);
    expect(fragment).toBeTruthy();
  });

  it('composes with and()', () => {
    const composed = and(activeOnly(quizzes.deletedAt), activeOnly(quizzes.deletedAt));
    expect(composed).toBeTruthy();
  });
});
