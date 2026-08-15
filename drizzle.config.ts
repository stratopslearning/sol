import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load env files in Next.js precedence order: .env.local overrides .env.
// Both are tried so the migrator works whether the project uses one or both.
config({ path: '.env' });
config({ path: '.env.local', override: true });

// Prefer a dedicated migrator role (sol_migrator). Fall back to DATABASE_URL
// for local/dev single-credential setups.
const migrateUrl =
  process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL;

if (!migrateUrl) {
  throw new Error(
    'DATABASE_MIGRATE_URL or DATABASE_URL is required. Set it in .env or .env.local before running drizzle-kit.',
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
