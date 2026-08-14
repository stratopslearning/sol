/**
 * Shared Neon Pool for load-test seed/cleanup scripts.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from '../../app/db/schema';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
loadEnv({ path: 'load-test/.env', override: true, quiet: true });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

export const LOADTEST_CLERK_PREFIX = 'loadtest_';
export const LOADTEST_EMAIL_DOMAIN = '@loadtest.local';

export function assertLoadTestDbAllowed(): string {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to seed/clean load-test data when VERCEL_ENV=production');
  }
  const url =
    process.env.LOAD_TEST_DATABASE_URL ||
    (process.env.ALLOW_LOAD_TEST_SEED === '1' ? process.env.DATABASE_URL : undefined);
  if (!url?.startsWith('postgres')) {
    throw new Error(
      'Set LOAD_TEST_DATABASE_URL to the Neon *branch* pooled URL (or ALLOW_LOAD_TEST_SEED=1 with DATABASE_URL).',
    );
  }
  if (!url.includes('-pooler') && process.env.ALLOW_LOAD_TEST_UNPOOLED !== '1') {
    console.warn(
      'LOAD_TEST_DATABASE_URL does not look pooled (-pooler). Prefer the Neon pooled connection string.',
    );
  }
  return url;
}

export function createLoadTestDb(url: string) {
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  return { pool, db };
}
