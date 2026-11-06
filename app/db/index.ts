import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Always use the `ws` package for Neon transactions. Node 22+ ships a global
// WebSocket (undici) that does not reliably keep session state across
// `BEGIN` / `set_config` / DML in Pool transactions — which breaks RLS GUCs
// (`app.tenant_id`) during workspace provisioning and withTenant().
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

// Prefer HTTP fetch for *non-transaction* pooled queries. Neon idle WebSockets
// produce "Connection terminated unexpectedly" (and ws/bufferUtil flakes under
// Next bundling). Authoring writes that need FORCE RLS use SECURITY DEFINER
// functions over this HTTP path so they don't depend on sticky GUC sessions.
if (typeof neonConfig.poolQueryViaFetch !== 'undefined') {
  neonConfig.poolQueryViaFetch = true;
}

// One Pool per Lambda/edge instance. Cap at 1 connection: the default node-pg
// `max` of 10 times hundreds of warm Vercel instances exhausts Neon compute
// (≈100 connections at 0.25 CU). Prefer Neon's pooled (`-pooler`) DATABASE_URL.
declare global {
  // eslint-disable-next-line no-var
  var __neonPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __neonPoolErrorBound__: boolean | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (
  connectionString &&
  !connectionString.includes('-pooler') &&
  process.env.NODE_ENV === 'production'
) {
  console.warn(
    'DATABASE_URL does not look like a Neon pooled (-pooler) connection string. Under serverless load this can exhaust compute connections.',
  );
}

// Vercel/serverless: one connection per isolate (many isolates × default max 10
// exhausts Neon). Long-running Node (next dev / next start): allow a small pool
// so concurrent exam traffic is not fully serialized.
const isServerless = Boolean(process.env.VERCEL);
const poolMax = Number(process.env.PG_POOL_MAX) || (isServerless ? 1 : 10);

export const pool =
  globalThis.__neonPool__ ??
  new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });

if (!globalThis.__neonPoolErrorBound__) {
  pool.on('error', (error: Error) => {
    // Idle-client disconnects are expected with Neon's proxy. Swallow so they
    // do not become unhandled 'error' events; the next query opens a new socket.
    console.error('[db] neon pool error', error);
  });
  globalThis.__neonPoolErrorBound__ = true;
}

if (process.env.NODE_ENV !== 'production' || isServerless) {
  globalThis.__neonPool__ = pool;
}

export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from './schema';
