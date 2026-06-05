/**
 * Vitest setupFiles entry — runs before each test file in the worker.
 * Provides:
 *  - testDb: a postgres client connected to the test database for seed helpers
 *  - beforeEach TRUNCATE to guarantee clean-slate isolation per test
 *  - afterAll closes the client
 */
import postgres from 'postgres';
import { beforeEach, afterAll } from 'vitest';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set.\n' +
      'Set TEST_DATABASE_URL=postgres://user:pass@localhost:5432/clontwitter_test ' +
      'to run integration tests.',
  );
}

export const testDb = postgres(testUrl, { max: 3 });

beforeEach(async () => {
  // Truncate in FK dependency order: dependent tables first, then parent tables.
  // RESTART IDENTITY resets sequences; CASCADE clears any remaining FK references.
  await testDb`TRUNCATE TABLE likes, follows, tweets, users RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await testDb.end();
});
