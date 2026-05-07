/**
 * Apply a single Drizzle migration file directly through the Neon driver.
 * Used as a fallback when `drizzle-kit migrate` silently fails (it has
 * known issues running through @neondatabase/serverless on macOS).
 *
 *   tsx scripts/apply-migration.ts drizzle/0004_phase6_destructive.sql
 *
 * The script splits on `--> statement-breakpoint`, runs everything inside a
 * single transaction (rolls back on the first error), and records the
 * migration in `drizzle.__drizzle_migrations` on success.
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

function hashMigrationSql(sql: string): string {
  const parts = sql
    .split(/--> statement-breakpoint/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return crypto.createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Usage: tsx scripts/apply-migration.ts <path-to-sql>');
  }
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Migration file not found: ${absolutePath}`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }

  const sql = fs.readFileSync(absolutePath, 'utf8');
  const statements = sql
    .split(/--> statement-breakpoint/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const hash = hashMigrationSql(sql);
  console.log(`Applying ${path.basename(absolutePath)} (${statements.length} statements, hash ${hash.slice(0, 8)})`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // Skip if already applied.
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`,
    );
    const existing = await client.query<{ hash: string }>(
      'SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1',
      [hash],
    );
    if (existing.rows.length > 0) {
      console.log('Already applied; nothing to do.');
      return;
    }

    await client.query('BEGIN');
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, Date.now()],
    );
    await client.query('COMMIT');
    console.log('Migration applied and recorded.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('apply-migration failed:', err);
  process.exit(1);
});
