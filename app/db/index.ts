import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// `@neondatabase/serverless`'s websocket transport is required for
// transactions / pooled connections in Node.js environments. In Vercel's
// serverless runtime there's a built-in WebSocket, so we only swap in the
// `ws` polyfill when the global one is absent (e.g. local Node.js + tests).
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Prefer HTTP fetch for pooled queries on serverless. Neon idle WebSockets are
// what produce "Connection terminated unexpectedly" on Vercel after the
// compute suspends; fetch reconnects per query instead of holding a socket.
if (typeof neonConfig.poolQueryViaFetch !== 'undefined') {
  neonConfig.poolQueryViaFetch = true;
}

// One Pool per Lambda/edge instance. Cap at 1 connection: the default node-pg
// `max` of 10 times hundreds of warm Vercel instances exhausts Neon compute
// (≈100 connections at 0.25 CU). Prefer Neon's pooled (`-pooler`) DATABASE_URL.
declare global {
  // eslint-disable-next-line no-var
  var __neonPool__: Pool | undefined;
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

const pool =
  globalThis.__neonPool__ ??
  new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });

pool.on('error', (error: Error) => {
  // Idle-client disconnects are expected with Neon's proxy. Swallow so they
  // do not become unhandled 'error' events; the next query opens a new socket.
  console.error('[db] neon pool error', error);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__neonPool__ = pool;
}

export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from './schema';
