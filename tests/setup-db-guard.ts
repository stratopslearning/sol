/**
 * Fail fast in CI when DB project runs without TEST_DATABASE_URL
 * (no silent skip-and-green).
 */
if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'CI=true but TEST_DATABASE_URL is unset — db project cannot skip in CI',
  );
}
