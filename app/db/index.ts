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

// One Pool per Lambda/edge instance. The Pool reuses underlying connections
// across requests when possible while still letting Drizzle open transactions.
declare global {
  // eslint-disable-next-line no-var
  var __neonPool__: Pool | undefined;
}

const pool =
  globalThis.__neonPool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__neonPool__ = pool;
}

export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from './schema';
