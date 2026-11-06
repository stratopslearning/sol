/**
 * Apply drizzle/0041_role_bindings.sql against the allowlisted DEV database.
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/apply-0041-role-bindings.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

async function main() {
  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  const sqlPath = resolve(process.cwd(), 'drizzle/0041_role_bindings.sql');
  const body = readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(body);
    await client.query('COMMIT');
    console.log('[apply-0041] OK on', target.host, target.database);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[apply-0041] FAILED', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
