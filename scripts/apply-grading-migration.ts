/**
 * Apply `drizzle/0005_grading_redesign.sql` to Neon using the same
 * `@neondatabase/serverless` driver the app already uses.
 *
 * Every statement in 0005 is additive and idempotent (IF NOT EXISTS /
 * IF EXISTS), so this is safe to run against a populated DB — no existing
 * row, column, or constraint is modified.
 *
 * Run with: `npx tsx scripts/apply-grading-migration.ts`
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (set it in .env / .env.local)');
  process.exit(1);
}

if (typeof WebSocket === 'undefined') {
  // Same pattern as scripts/reconcile-drizzle-history.ts.
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

const MIGRATION_TAG = '0005_grading_redesign';
const MIGRATION_WHEN = 1779840000000;

function hashMigrationSql(source: string): string {
  const parts = source
    .split(/--> statement-breakpoint/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return crypto.createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
}

async function main() {
  const sqlPath = path.join(process.cwd(), 'drizzle', `${MIGRATION_TAG}.sql`);
  const source = fs.readFileSync(sqlPath, 'utf8');
  const migrationHash = hashMigrationSql(source);

  console.log(`Migration:  ${MIGRATION_TAG}`);
  console.log(`SHA-256:    ${migrationHash}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Ensure Drizzle's bookkeeping table exists so we can record the apply.
    await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const existing = await pool.query<{ hash: string }>(
      'SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1 LIMIT 1',
      [migrationHash],
    );

    if (existing.rows.length > 0) {
      console.log('Already recorded in drizzle.__drizzle_migrations — re-running is a no-op.');
    }

    const statements = source
      .split(/-->\s*statement-breakpoint/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Applying ${statements.length} idempotent statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]!;
      const preview =
        stmt
          .split('\n')
          .find((l) => l.trim() && !l.trim().startsWith('--'))
          ?.slice(0, 80) ?? '<comment-only>';
      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview} ... `);
      await pool.query(stmt);
      process.stdout.write('ok\n');
    }

    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [migrationHash, MIGRATION_WHEN],
      );
      console.log('Recorded in drizzle.__drizzle_migrations.');
    }

    const verification = await pool.query(`
      SELECT
        to_regclass('public.grading_cache')::text                                              AS grading_cache,
        EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='questions' AND column_name='rubric')                       AS questions_rubric,
        EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='questions' AND column_name='rubric_version')               AS questions_rubric_version,
        EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='attempts' AND column_name='grading_status')                AS attempts_grading_status,
        EXISTS (SELECT 1 FROM pg_indexes
                  WHERE indexname='attempts_grading_status_idx')                               AS attempts_grading_status_idx
    `);
    console.log('\nSchema verification:');
    console.log(verification.rows[0]);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nMigration failed:', err);
    process.exit(2);
  });
