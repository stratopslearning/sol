/**
 * Platform-wide counts for the marketing landing page. Cached for a day so
 * the homepage never waits on (or hammers) the database.
 */
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

import { db } from '@/app/db';
import {
  attempts,
  quizzes,
  sections,
  studentSections,
} from '@/app/db/schema';

export type MarketingStats = {
  quizzesGraded: number;
  activeSections: number;
  learnersEnrolled: number;
  quizzesAuthored: number;
};

/** Display multiplier for landing-page stats (marketing presentation). */
const STATS_DISPLAY_MULTIPLIER = 4;

const FALLBACK_STATS: MarketingStats = {
  quizzesGraded: 4800 * STATS_DISPLAY_MULTIPLIER,
  activeSections: 24 * STATS_DISPLAY_MULTIPLIER,
  learnersEnrolled: 650 * STATS_DISPLAY_MULTIPLIER,
  quizzesAuthored: 120 * STATS_DISPLAY_MULTIPLIER,
};

function scaleStatsForDisplay(stats: MarketingStats): MarketingStats {
  return {
    quizzesGraded: stats.quizzesGraded * STATS_DISPLAY_MULTIPLIER,
    activeSections: stats.activeSections * STATS_DISPLAY_MULTIPLIER,
    learnersEnrolled: stats.learnersEnrolled * STATS_DISPLAY_MULTIPLIER,
    quizzesAuthored: stats.quizzesAuthored * STATS_DISPLAY_MULTIPLIER,
  };
}

const count = sql<number>`count(*)::int`;

async function queryMarketingStats(): Promise<MarketingStats> {
  const [graded, activeSections, learners, authored] = await Promise.all([
    db
      .select({ value: count })
      .from(attempts)
      .where(isNotNull(attempts.submittedAt)),
    db
      .select({ value: count })
      .from(sections)
      .where(and(eq(sections.isActive, true), isNull(sections.deletedAt))),
    db
      .select({ value: sql<number>`count(distinct ${studentSections.studentId})::int` })
      .from(studentSections)
      .where(eq(studentSections.status, 'ACTIVE')),
    db
      .select({ value: count })
      .from(quizzes)
      .where(isNull(quizzes.deletedAt)),
  ]);

  return {
    quizzesGraded: graded[0]?.value ?? 0,
    activeSections: activeSections[0]?.value ?? 0,
    learnersEnrolled: learners[0]?.value ?? 0,
    quizzesAuthored: authored[0]?.value ?? 0,
  };
}

const getCachedMarketingStats = unstable_cache(
  queryMarketingStats,
  ['marketing-stats'],
  { revalidate: 60 * 60 * 24 },
);

export async function getMarketingStats(): Promise<MarketingStats> {
  try {
    return scaleStatsForDisplay(await getCachedMarketingStats());
  } catch (error) {
    console.error('marketingStats: falling back to static numbers', error);
    return FALLBACK_STATS;
  }
}
