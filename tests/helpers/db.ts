/**
 * Test database helpers.
 *
 * Localhost / CI ephemeral Postgres uses node-postgres (`pg`). Neon remotes
 * keep `@neondatabase/serverless` Pool (same as app/db).
 */
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from 'ws';

import * as schema from '@/app/db/schema';

function isLocalPostgresHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export type TestDb = ReturnType<typeof drizzlePg<typeof schema>> & {
  $client: PgPool | NeonPool;
};

let pool: PgPool | NeonPool | undefined;
let cached: TestDb | undefined;

/** Lazily create a Drizzle instance bound to TEST_DATABASE_URL. */
export function getTestDb(): TestDb {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set; tests that need a DB must skip when absent.');
  }
  if (!cached) {
    const connectionString = process.env.TEST_DATABASE_URL;
    const useTcpPg = isLocalPostgresHost(connectionString);

    if (useTcpPg) {
      pool = new PgPool({ connectionString });
      cached = Object.assign(drizzlePg(pool, { schema }), {
        $client: pool,
      }) as TestDb;
    } else {
      if (typeof globalThis.WebSocket === 'undefined') {
        neonConfig.webSocketConstructor = ws as any;
      }
      pool = new NeonPool({ connectionString });
      cached = Object.assign(drizzleNeon(pool, { schema }), {
        $client: pool,
      }) as TestDb;
    }
  }
  return cached!;
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    cached = undefined;
  }
}
