import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Vitest is configured to run from `tests/` and to resolve `@/...` imports
// the same way Next does (root-relative). Integration tests assume a running
// `TEST_DATABASE_URL`; they self-skip when the env var is missing so the
// fast unit-test pass remains green even on a fresh checkout.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
