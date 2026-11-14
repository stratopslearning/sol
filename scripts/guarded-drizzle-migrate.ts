/**
 * Run drizzle-kit migrate only after the dev-DB allowlist + confirm gate.
 *
 *   npx tsx scripts/guarded-drizzle-migrate.ts --confirm-dev-db
 *   # or: I_CONFIRM_DEV_DB=1 npm run migrate
 */
import { spawnSync } from 'node:child_process';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';
import { assertMigrateRoleOrExit } from './lib/assertMigrateRole';

const target = assertDevDatabaseOrExit({
  urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
});
assertMigrateRoleOrExit(target.url);

// Prefer migrator URL for drizzle-kit even if DATABASE_URL is also set.
const env = {
  ...process.env,
  DATABASE_URL: target.url,
  DATABASE_MIGRATE_URL: target.url,
};

const result = spawnSync('npx', ['drizzle-kit', 'migrate'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
