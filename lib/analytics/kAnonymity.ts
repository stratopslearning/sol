/**
 * k-anonymity for analytics: groups with fewer than K contributing records are
 * suppressed so a professor cannot infer an individual student's result from a
 * tiny cohort. Configure via ANALYTICS_K_ANONYMITY_MIN (default 5).
 */
import type { ConceptMasteryRow } from '@/lib/analytics/aggregateConcepts';
import type { LessonCompletionRow } from '@/lib/analytics/lessons';

export const DEFAULT_K_ANONYMITY_MIN = 5;

export function kAnonymityMin(): number {
  const raw = Number(process.env.ANALYTICS_K_ANONYMITY_MIN);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_K_ANONYMITY_MIN;
}

/** True when a group of size n must be suppressed. */
export function isSuppressed(n: number, k = kAnonymityMin()): boolean {
  return n < k;
}

export type Suppressible = { suppressed?: boolean };

/**
 * Concept rows: group size = attemptCount. Suppressed rows keep their tag and
 * question count (structure is not sensitive) but lose every outcome number.
 */
export function suppressConceptRows(
  rows: ConceptMasteryRow[],
  k = kAnonymityMin(),
): ConceptMasteryRow[] {
  return rows.map((r) =>
    isSuppressed(r.attemptCount, k)
      ? {
          ...r,
          attemptCount: 0,
          correctCount: 0,
          successRate: 0,
          gap: false,
          suppressed: true,
        }
      : r,
  );
}

/** Lesson rows: group size = rosterCount. */
export function suppressLessonRows(
  rows: LessonCompletionRow[],
  k = kAnonymityMin(),
): LessonCompletionRow[] {
  return rows.map((r) =>
    isSuppressed(r.rosterCount, k)
      ? {
          ...r,
          rosterCount: 0,
          neverStarted: 0,
          started: 0,
          completed: 0,
          completionRate: 0,
          suppressed: true,
        }
      : r,
  );
}
