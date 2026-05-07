/**
 * Pre-migration data integrity scan.
 *
 * Run BEFORE any migration that adds unique constraints or foreign-key
 * tightenings. Each query returns rows that would violate the constraints
 * we're about to add — investigate and reconcile them before applying.
 *
 *   npm run db:preflight
 *
 * Exit codes:
 *   0 = clean, safe to migrate
 *   2 = duplicates found, do not migrate
 *   1 = error
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

const checks: Array<{ label: string; sql: string }> = [
  {
    label: 'professor_sections duplicates',
    sql: `SELECT professor_id, section_id, COUNT(*)::int AS dupes
          FROM professor_sections
          GROUP BY professor_id, section_id
          HAVING COUNT(*) > 1`,
  },
  {
    label: 'student_sections duplicates',
    sql: `SELECT student_id, section_id, COUNT(*)::int AS dupes
          FROM student_sections
          GROUP BY student_id, section_id
          HAVING COUNT(*) > 1`,
  },
  {
    label: 'quiz_sections duplicates',
    sql: `SELECT quiz_id, section_id, COUNT(*)::int AS dupes
          FROM quiz_sections
          GROUP BY quiz_id, section_id
          HAVING COUNT(*) > 1`,
  },
  {
    label: 'assignments duplicates',
    sql: `SELECT quiz_id, student_id, COUNT(*)::int AS dupes
          FROM assignments
          GROUP BY quiz_id, student_id
          HAVING COUNT(*) > 1`,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    let hasDupes = false;
    for (const { label, sql } of checks) {
      const result = await pool.query(sql);
      console.log(`== ${label} ==`);
      if (result.rows.length === 0) {
        console.log('  OK: no duplicates');
      } else {
        hasDupes = true;
        console.table(result.rows);
      }
    }
    if (hasDupes) {
      console.error('\nPreflight FAILED. Reconcile duplicates before migrating.');
      process.exit(2);
    } else {
      console.log('\nPreflight OK.');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('preflight failed:', err);
  process.exit(1);
});
