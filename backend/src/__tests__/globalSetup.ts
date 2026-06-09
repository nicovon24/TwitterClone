/**
 * Vitest globalSetup — runs once in the main process before any worker is forked.
 * Sets DATABASE_URL to TEST_DATABASE_URL so that db/index.ts and env.ts read
 * the test database connection string when modules are first loaded in workers.
 *
 * The root .env is already loaded by vitest.config.ts before this runs.
 */
export function setup(): void {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL is not set.\n' +
        'Set TEST_DATABASE_URL=postgres://user:pass@localhost:5433/clontwitter_test ' +
        'to run integration tests.',
    );
  }
  // Override DATABASE_URL so env.ts validation passes and db/index.ts connects
  // to the test database rather than the development database.
  process.env.DATABASE_URL = testUrl;
  // Ensure JWT secrets are available (use test values if not already set)
  process.env.JWT_SECRET ??= 'test-jwt-secret-integration';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret-integration';
}
