/**
 * Test database helpers.
 *
 * Connects directly via @neondatabase/serverless Pool. Each test file is
 * responsible for cleaning up its own state (we don't truncate-everything
 * between tests because the integration tests are designed to be additive
 * and clean up via deletion of the rows they created).
 */
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from '@/app/db/schema';

if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

export type TestDb = NeonDatabase<typeof schema> & {
  $client: Pool;
};

let pool: Pool | undefined;
let cached: TestDb | undefined;

/** Lazily create a Drizzle instance bound to TEST_DATABASE_URL. */
export function getTestDb(): TestDb {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set; tests that need a DB must skip when absent.');
  }
  if (!cached) {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    cached = Object.assign(drizzle(pool, { schema }), { $client: pool }) as TestDb;
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
