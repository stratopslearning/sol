/**
 * SHA-256 keyed answer cache for the grading pipeline.
 *
 * Cache key = sha256(questionId | rubricVersion | modelVersion | scoringVersion | normalize(answer))
 *
 * Auto-invalidates when:
 * - the question text or reference answer changes (caller bumps `rubricVersion`)
 * - we upgrade the grading model (caller bumps `GRADING_MODEL_VERSION`)
 * - we change deterministic scoring logic (caller bumps `SCORING_VERSION`)
 *
 * Normalization strips trivial differences (case, whitespace, trailing
 * punctuation) so "Quality assurance is a process." and "quality assurance
 * is a process" hit the same cache row.
 */
import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { gradingCache } from '@/app/db/schema';
import type {
  RubricCriterion,
  RubricMatch,
  StoredFeedback,
} from '@/lib/gradingTypes';

/** Bump when deterministic score computation changes (e.g. any-N top-N scoring). */
export const SCORING_VERSION = 2;

/**
 * Lowercase, collapse whitespace, drop trailing punctuation. Intentionally
 * conservative — we only want to bucket together answers that are obviously
 * the same. Semantic equivalence (paraphrasing) is not a cache concern.
 */
export function normalizeAnswerForCache(answer: string): string {
  return answer
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?\s]+$/g, '')
    .trim();
}

export function computeCacheKey(args: {
  questionId: string;
  studentAnswer: string;
  rubricVersion: number;
  modelVersion: string;
}): string {
  const normalized = normalizeAnswerForCache(args.studentAnswer);
  return createHash('sha256')
    .update(
      `${args.questionId}|${args.rubricVersion}|${args.modelVersion}|${SCORING_VERSION}|${normalized}`,
    )
    .digest('hex');
}

export type CachedGradingPayload = {
  score: number;
  feedback: string;
  confidence: number;
  maxPoints: number;
  rubric: RubricCriterion[];
  rubricMatches: RubricMatch[];
  modelVersion: string;
  rubricVersion: number;
  requiredMatchCount?: number | null;
};

export async function lookupCachedGrading(args: {
  questionId: string;
  studentAnswer: string;
  rubricVersion: number;
  modelVersion: string;
}): Promise<CachedGradingPayload | null> {
  if (!args.studentAnswer || !args.studentAnswer.trim()) return null;
  const key = computeCacheKey(args);
  try {
    const row = await db.query.gradingCache.findFirst({
      where: and(
        eq(gradingCache.key, key),
        eq(gradingCache.rubricVersion, args.rubricVersion),
        eq(gradingCache.modelVersion, args.modelVersion),
      ),
    });
    if (!row) return null;
    return row.payload as CachedGradingPayload;
  } catch (error) {
    // Cache lookup must NEVER block grading. A missing table / transient DB
    // error simply degrades to "always miss".
    console.warn('gradingCache.lookup failed:', error);
    return null;
  }
}

export async function writeCachedGrading(args: {
  questionId: string;
  studentAnswer: string;
  rubricVersion: number;
  modelVersion: string;
  payload: CachedGradingPayload;
}): Promise<void> {
  if (!args.studentAnswer || !args.studentAnswer.trim()) return;
  const key = computeCacheKey(args);
  try {
    await db
      .insert(gradingCache)
      .values({
        key,
        questionId: args.questionId,
        rubricVersion: args.rubricVersion,
        modelVersion: args.modelVersion,
        payload: args.payload,
      })
      .onConflictDoNothing({ target: gradingCache.key });
  } catch (error) {
    console.warn('gradingCache.write failed:', error);
  }
}

/**
 * Build a StoredFeedback from a cache hit. Caller sets `status: 'graded'` and
 * marks `cached: true`.
 */
export function cachedPayloadToFeedback(
  payload: CachedGradingPayload,
): StoredFeedback {
  return {
    score: payload.score,
    feedback: payload.feedback,
    confidence: payload.confidence,
    maxPoints: payload.maxPoints,
    status: 'graded',
    rubric: payload.rubric,
    rubricMatches: payload.rubricMatches,
    modelVersion: payload.modelVersion,
    rubricVersion: payload.rubricVersion,
    requiredMatchCount: payload.requiredMatchCount ?? undefined,
    gradedAt: new Date().toISOString(),
    cached: true,
  };
}
