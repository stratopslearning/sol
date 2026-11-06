import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, '.') };

const shared = {
  environment: 'node' as const,
  globals: false,
  setupFiles: ['tests/setup.ts'],
  testTimeout: 30_000,
  hookTimeout: 60_000,
};

/**
 * Two projects:
 * - unit: always runs (no DB)
 * - db: isolation + integration + tests/db; requires TEST_DATABASE_URL
 *   (fails hard when CI=true and URL is missing)
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          ...shared,
          name: 'unit',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/isolation/gradingCacheTenantKey.test.ts',
          ],
        },
      },
      {
        resolve: { alias },
        test: {
          ...shared,
          name: 'db',
          include: [
            'tests/db/**/*.test.ts',
            'tests/isolation/**/*.test.ts',
            'tests/integration/**/*.test.ts',
          ],
          exclude: ['tests/isolation/gradingCacheTenantKey.test.ts'],
          setupFiles: ['tests/setup.ts', 'tests/setup-db-guard.ts'],
          testTimeout: 60_000,
          hookTimeout: 90_000,
        },
      },
    ],
  },
});
