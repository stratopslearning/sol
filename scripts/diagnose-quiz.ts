/**
 * One-off diagnostic for a quiz's attempts / grading state.
 * Usage: npx tsx scripts/diagnose-quiz.ts <quizId>
 */
import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

const quizId = process.argv[2] ?? 'cc3914a7-1fe2-422e-b272-e6c9f780ed29';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FALLBACK_SNIPPET =
  'Grading system temporarily unavailable';

async function main() {
  const client = await pool.connect();
  try {
    const quiz = await client.query(
      `SELECT id, title, time_limit, max_attempts FROM quizzes WHERE id = $1`,
      [quizId],
    );
    console.log('\n=== QUIZ ===');
    console.table(quiz.rows);

    const questions = await client.query(
      `SELECT id, "order", type, points,
        CASE WHEN correct_answer IS NULL OR trim(correct_answer) = '' THEN true ELSE false END AS missing_ref
       FROM questions WHERE quiz_id = $1 ORDER BY "order"`,
      [quizId],
    );
    console.log('\n=== QUESTIONS ===');
    console.table(questions.rows);

    const attemptStats = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) AS submitted,
         COUNT(*) FILTER (WHERE submitted_at IS NULL) AS in_progress,
         COUNT(DISTINCT student_id) FILTER (WHERE submitted_at IS NOT NULL) AS unique_submitted
       FROM attempts WHERE quiz_id = $1`,
      [quizId],
    );
    console.log('\n=== ATTEMPT COUNTS ===');
    console.table(attemptStats.rows);

    const inProgress = await client.query(
      `SELECT a.id, u.email, a.started_at, a.submitted_at,
         (SELECT count(*)::int FROM jsonb_object_keys(a.answers)) AS num_answers
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.quiz_id = $1 AND a.submitted_at IS NULL
       ORDER BY a.started_at DESC
       LIMIT 20`,
      [quizId],
    );
    console.log('\n=== IN-PROGRESS (not submitted) sample ===');
    console.table(inProgress.rows);

    const fallbackAttempts = await client.query(
      `SELECT a.id, u.email, a.submitted_at, a.score, a.max_score, a.percentage
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.quiz_id = $1 AND a.submitted_at IS NOT NULL
         AND a.gpt_feedback::text ILIKE $2
       ORDER BY a.submitted_at DESC
       LIMIT 30`,
      [quizId, `%${FALLBACK_SNIPPET}%`],
    );
    console.log('\n=== SUBMITTED WITH AI FALLBACK MESSAGE ===');
    console.log(`Count: ${fallbackAttempts.rowCount}`);
    console.table(fallbackAttempts.rows);

    const enrolledVsSubmitted = await client.query(
      `WITH quiz_sections_list AS (
         SELECT section_id FROM quiz_sections WHERE quiz_id = $1
       ),
       enrolled AS (
         SELECT DISTINCT ss.student_id, u.email
         FROM student_sections ss
         JOIN users u ON u.id = ss.student_id
         WHERE ss.section_id IN (SELECT section_id FROM quiz_sections_list)
           AND ss.status = 'ACTIVE'
       ),
       submitted AS (
         SELECT DISTINCT student_id FROM attempts
         WHERE quiz_id = $1 AND submitted_at IS NOT NULL
       )
       SELECT e.email,
         EXISTS (SELECT 1 FROM attempts ip WHERE ip.quiz_id = $1 AND ip.student_id = e.student_id AND ip.submitted_at IS NULL) AS has_in_progress,
         EXISTS (SELECT 1 FROM submitted s WHERE s.student_id = e.student_id) AS has_submitted
       FROM enrolled e
       WHERE NOT EXISTS (SELECT 1 FROM submitted s WHERE s.student_id = e.student_id)
       ORDER BY e.email
       LIMIT 40`,
      [quizId],
    );
    console.log('\n=== ENROLLED BUT NEVER SUBMITTED ===');
    console.log(`Count: ${enrolledVsSubmitted.rowCount}`);
    console.table(enrolledVsSubmitted.rows);

    const staleInProgress = await client.query(
      `SELECT a.id, u.email, a.started_at,
         EXTRACT(EPOCH FROM (NOW() - a.started_at))/60 AS minutes_since_start
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.quiz_id = $1 AND a.submitted_at IS NULL
         AND a.started_at < NOW() - INTERVAL '35 minutes'
       ORDER BY a.started_at`,
      [quizId],
    );
    console.log('\n=== STALE IN-PROGRESS (>35 min, likely timer/submit failures) ===');
    console.log(`Count: ${staleInProgress.rowCount}`);
    console.table(staleInProgress.rows);

    const inProgressDetail = await client.query(
      `SELECT a.id, u.email, a.started_at,
         (SELECT count(*)::int FROM jsonb_object_keys(a.answers)) AS answer_count
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.quiz_id = $1 AND a.submitted_at IS NULL
       ORDER BY a.started_at DESC`,
      [quizId],
    );
    console.log('\n=== ALL IN-PROGRESS WITH ANSWER COUNTS ===');
    console.table(inProgressDetail.rows);

    const fbStats = await client.query(
      `SELECT q."order" AS qnum, COUNT(*)::int AS fallback_count
       FROM attempts a
       CROSS JOIN questions q
       WHERE a.quiz_id = $1 AND q.quiz_id = $1 AND a.submitted_at IS NOT NULL
         AND (a.gpt_feedback->(q.id::text)->>'feedback') ILIKE $2
       GROUP BY q."order" ORDER BY q."order"`,
      [quizId, `%${FALLBACK_SNIPPET}%`],
    );
    console.log('\n=== AI FALLBACK COUNT PER QUESTION (across all submitted attempts) ===');
    console.table(fbStats.rows);

    const enrolledCount = await client.query(
      `WITH qs AS (SELECT section_id FROM quiz_sections WHERE quiz_id = $1)
       SELECT COUNT(DISTINCT ss.student_id)::int AS enrolled
       FROM student_sections ss
       WHERE ss.section_id IN (SELECT section_id FROM qs) AND ss.status = 'ACTIVE'`,
      [quizId],
    );
    console.log('\n=== ENROLLED STUDENTS IN ASSIGNED SECTIONS ===');
    console.table(enrolledCount.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
