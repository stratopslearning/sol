/**
 * Reconcile Drizzle migration history.
 *
 * Drizzle records each applied migration as one row in
 * `drizzle.__drizzle_migrations`, keyed by a SHA-256 hash of the migration
 * SQL body. When a database is restored from a dump or imported from another
 * project, that history table is empty even though the schema is fully
 * applied. The next `drizzle-kit migrate` invocation would then try to run
 * every migration from scratch and fail on duplicate-object errors.
 *
 * This script computes the same hash Drizzle would produce for each
 * `drizzle/<idx>_*.sql` file (see drizzle-kit's MigrationMeta routine —
 * SHA-256 of the SQL string after splitting on `--> statement-breakpoint`)
 * and inserts a row per migration, skipping any hash that's already present.
 *
 * Run with `npm run db:reconcile-history`.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints?: boolean;
}

interface Journal {
  entries: JournalEntry[];
}

function hashMigrationSql(sql: string): string {
  // Drizzle splits on the breakpoint marker, joins individual statements, and
  // hashes the joined result. Reproducing that exactly so our hashes match.
  const parts = sql
    .split(/--> statement-breakpoint/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const canonical = parts.join('\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const drizzleDir = path.join(process.cwd(), 'drizzle');
  const journalPath = path.join(drizzleDir, 'meta', '_journal.json');
  if (!fs.existsSync(journalPath)) {
    throw new Error(`Drizzle journal not found at ${journalPath}`);
  }
  const journal: Journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`,
    );

    const existing = await client.query<{ hash: string }>(
      'SELECT hash FROM drizzle.__drizzle_migrations',
    );
    const existingHashes = new Set(existing.rows.map((r) => r.hash));

    let inserted = 0;
    let skipped = 0;
    for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
      const sqlPath = path.join(drizzleDir, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        console.warn(`[skip] missing migration file: ${sqlPath}`);
        continue;
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const hash = hashMigrationSql(sql);
      if (existingHashes.has(hash)) {
        console.log(`[skip] ${entry.tag} already recorded (${hash.slice(0, 8)})`);
        skipped++;
        continue;
      }
      await client.query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [hash, entry.when],
      );
      console.log(`[inserted] ${entry.tag} (${hash.slice(0, 8)})`);
      inserted++;
    }
    console.log(`Done. ${inserted} inserted, ${skipped} already present.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('reconcile-drizzle-history failed:', err);
  process.exit(1);
});
