/**
 * CONTRACT step for users.role (item 18). Drops the column only when:
 *   - the legacy authz count is <= MAX_LEGACY (default 5), and
 *   - every legacy ADMIN has platform_staff.
 * Also requires schema.ts to no longer define `role` on users (checked textually),
 * otherwise the app would break against the new DB.
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/contract-drop-users-role.ts [--max-legacy=5]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';
import { assertMigrateRoleOrExit } from './lib/assertMigrateRole';

function legacyCount(): number {
  const out = execFileSync('node', ['--import', 'tsx', 'scripts/count-legacy-authz.ts'], {
    encoding: 'utf8',
  });
  const m = /legacy_authz_count=(\d+)/.exec(out);
  if (!m) throw new Error('could not read legacy_authz_count');
  return Number(m[1]);
}

async function main() {
  const maxArg = process.argv.find((a) => a.startsWith('--max-legacy='));
  const maxLegacy = maxArg ? Number(maxArg.split('=')[1]) : 5;

  const count = legacyCount();
  if (count > maxLegacy) {
    console.error(
      `REFUSING: legacy authz count ${count} > ${maxLegacy}. Finish the Wave 2 cutover first.`,
    );
    process.exit(1);
  }

  const schema = readFileSync(resolve(process.cwd(), 'app/db/schema.ts'), 'utf8');
  const usersBlock = schema.slice(
    schema.indexOf("export const users = pgTable("),
    schema.indexOf('export const workspaces = pgTable('),
  );
  if (/\brole:\s*text\('role'/.test(usersBlock)) {
    console.error(
      "REFUSING: app/db/schema.ts still defines users.role. Remove it (and all readers) before dropping the column.",
    );
    process.exit(1);
  }

  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  assertMigrateRoleOrExit(target.url);

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const missing = await client.query(
      `SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND NOT platform_staff`,
    );
    if (missing.rows[0].n > 0) {
      throw new Error(`${missing.rows[0].n} legacy ADMIN users lack platform_staff`);
    }
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);
    await client.query('COMMIT');
    console.log('[contract] users.role dropped on', target.host, target.database);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[contract] FAILED', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
