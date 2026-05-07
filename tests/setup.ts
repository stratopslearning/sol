/**
 * Vitest global setup.
 *
 * - Loads .env / .env.local (so DATABASE_URL etc. are populated) if they
 *   exist locally.
 * - Stamps default test credentials so importing modules that read
 *   `process.env` at module-load time (e.g. lib/stripe, lib/env) don't
 *   crash. Real CI sets these via repository secrets.
 * - Polyfills the WebSocket constructor for @neondatabase/serverless when
 *   integration tests connect.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  CLERK_SECRET_KEY: 'sk_test_dummy',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy',
  STRIPE_SECRET_KEY: 'sk_test_dummy_stripe',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_dummy',
  STRIPE_PRICE_ID: 'price_test_dummy',
  OPENAI_API_KEY: 'sk-test-dummy',
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
};

for (const [key, value] of Object.entries(DEFAULT_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}

if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

/**
 * Helper for integration tests: returns the active TEST_DATABASE_URL or
 * `null`. Tests that need a DB should call `if (!hasTestDb()) it.skip(...)`.
 */
export function hasTestDb(): boolean {
  return !!process.env.TEST_DATABASE_URL;
}
