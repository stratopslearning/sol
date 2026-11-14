/**
 * Side-effect bootstrap for scripts that later import `@/app/db`.
 *
 * Import this module FIRST so dotenv + DEV_DB_HOSTS allowlist run before the
 * Neon pool is constructed:
 *
 *   import './lib/bootstrapDevDb';
 *   import { db } from '@/app/db';
 */
import { config as loadEnv } from 'dotenv';

import { assertDevDatabaseOrExit } from './assertDevDatabase';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

assertDevDatabaseOrExit({
  urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
});
