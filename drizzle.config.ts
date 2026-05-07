import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load env files in Next.js precedence order: .env.local overrides .env.
// Both are tried so the migrator works whether the project uses one or both.
config({ path: '.env' });
config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. Set it in .env or .env.local before running drizzle-kit.',
  );
}

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
}); 