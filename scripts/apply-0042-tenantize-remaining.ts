/**
 * Apply drizzle/0042_tenantize_remaining.sql against the allowlisted DEV database.
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/apply-0042-tenantize-remaining.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
if (process.env.WAVE_DATABASE_URL?.trim()) {
  process.env.DATABASE_MIGRATE_URL = process.env.WAVE_DATABASE_URL.trim();
}

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';
import { assertMigrateRoleOrExit } from './lib/assertMigrateRole';

async function main() {
  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  assertMigrateRoleOrExit(target.url);

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  const sqlPath = resolve(process.cwd(), 'drizzle/0042_tenantize_remaining.sql');
  const body = readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(body);
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       SELECT md5($1), (extract(epoch from now()) * 1000)::bigint
       WHERE NOT EXISTS (
         SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = md5($1)
       )`,
      [body],
    ).catch(() => {
      console.warn(
        '[apply-0042] drizzle.__drizzle_migrations update skipped (table may differ); SQL applied',
      );
    });
    await client.query('COMMIT');
    console.log('[apply-0042] OK on', target.host, target.database);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[apply-0042] FAILED', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
