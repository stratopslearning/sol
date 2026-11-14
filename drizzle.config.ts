import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

import { assertDevDatabase } from './scripts/lib/assertDevDatabase';
import { assertMigrateRole } from './scripts/lib/assertMigrateRole';

// Load env files in Next.js precedence order: .env.local overrides .env.
// Both are tried so the migrator works whether the project uses one or both.
config({ path: '.env' });
config({ path: '.env.local', override: true });

// Prefer a dedicated migrator role (sol_migrator). Fall back to DATABASE_URL
// for local/dev single-credential setups. Host must be on DEV_DB_HOSTS and
// the operator must pass --confirm-dev-db (or I_CONFIRM_DEV_DB=1).
// sol_app is never allowed for DDL.
let migrateUrl: string;
try {
  const target = assertDevDatabase({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  assertMigrateRole(target.url);
  migrateUrl = target.url;
  console.log(
    `[drizzle.config] using ${target.urlEnvVar} → ${target.host} / ${target.database} (branch: ${target.branchLabel})`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(
    `${message}\n\nDrizzle kit refuses to connect until DEV_DB_HOSTS + --confirm-dev-db (or I_CONFIRM_DEV_DB=1) are set, and the URL role must be sol_migrator (not sol_app). Prefer: npm run migrate`,
  );
}

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: migrateUrl,
  },
  verbose: true,
  strict: true,
});
