/**
 * Apply Wave SQL files 0042→0046 in order against the allowlisted DEV database.
 *
 *   I_CONFIRM_DEV_DB=1 ALLOW_OWNER_MIGRATE=1 \\
 *     DATABASE_MIGRATE_URL=... DEV_DB_BRANCH=... \\
 *     npx tsx scripts/apply-wave-migrations.ts
 *
 * Optional: --from=0043 to resume after a partial apply.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
// Prefer explicit WAVE_DATABASE_URL so .env.local cannot override a throwaway
// child branch target set by the operator/CI for this run.
if (process.env.WAVE_DATABASE_URL?.trim()) {
  process.env.DATABASE_MIGRATE_URL = process.env.WAVE_DATABASE_URL.trim();
}
if (process.env.WAVE_DEV_DB_HOSTS?.trim()) {
  const extra = process.env.WAVE_DEV_DB_HOSTS.trim();
  process.env.DEV_DB_HOSTS = [process.env.DEV_DB_HOSTS, extra]
    .filter(Boolean)
    .join(',');
}

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';
import { assertMigrateRoleOrExit } from './lib/assertMigrateRole';

const FILES = [
  'drizzle/0042_tenantize_remaining.sql',
  'drizzle/0043_role_binding_constraints.sql',
  'drizzle/0044_drop_users_role.sql',
  'drizzle/0045_offering_id_not_null.sql',
  'drizzle/0046_student_offerings.sql',
] as const;

async function main() {
  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  assertMigrateRoleOrExit(target.url);

  const fromArg = process.argv.find((a) => a.startsWith('--from='));
  const fromTag = fromArg?.slice('--from='.length) ?? '0042';
  const startIdx = FILES.findIndex((f) => f.includes(fromTag));
  if (startIdx < 0) {
    throw new Error(`Unknown --from=${fromTag}`);
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  const client = await pool.connect();

  try {
    for (const rel of FILES.slice(startIdx)) {
      const sqlPath = resolve(process.cwd(), rel);
      const body = readFileSync(sqlPath, 'utf8');
      console.log(`[apply-wave] applying ${rel} …`);
      await client.query('BEGIN');
      try {
        await client.query(body);
        await client.query('COMMIT');
        console.log(`[apply-wave] OK ${rel}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[apply-wave] FAILED ${rel}`, err);
        process.exitCode = 1;
        return;
      }
    }
    console.log('[apply-wave] all requested migrations applied on', target.host);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
