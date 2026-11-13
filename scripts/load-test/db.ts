/**
 * Shared Neon Pool for load-test seed/cleanup scripts.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from '../../app/db/schema';
import { assertDevDatabaseOrExit } from '../lib/assertDevDatabase';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
loadEnv({ path: 'load-test/.env', override: true, quiet: true });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

export const LOADTEST_CLERK_PREFIX = 'loadtest_';
export const LOADTEST_EMAIL_DOMAIN = '@loadtest.local';

export function assertLoadTestDbAllowed(): string {
  // Shared allowlist + confirm (DEV_DB_HOSTS + --confirm-dev-db / I_CONFIRM_DEV_DB).
  // Prefer LOAD_TEST_DATABASE_URL; allow DATABASE_URL only with ALLOW_LOAD_TEST_SEED=1.
  const urlEnvVars =
    process.env.LOAD_TEST_DATABASE_URL?.startsWith('postgres')
      ? ['LOAD_TEST_DATABASE_URL']
      : process.env.ALLOW_LOAD_TEST_SEED === '1'
        ? ['DATABASE_URL']
        : ['LOAD_TEST_DATABASE_URL'];
  const target = assertDevDatabaseOrExit({ urlEnvVars });
  if (!target.url.includes('-pooler') && process.env.ALLOW_LOAD_TEST_UNPOOLED !== '1') {
    console.warn(
      'Load-test URL does not look pooled (-pooler). Prefer the Neon pooled connection string.',
    );
  }
  return target.url;
}

export function createLoadTestDb(url: string) {
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  return { pool, db };
}
