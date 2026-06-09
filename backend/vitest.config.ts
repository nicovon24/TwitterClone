import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load .env from the monorepo root so TEST_DATABASE_URL is available
  // when running `npm test` from the backend directory.
  const rootEnv = loadEnv(mode, '../', '');
  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/__tests__/**/*.test.ts'],
      globalSetup: ['src/__tests__/globalSetup.ts'],
      setupFiles: ['src/__tests__/setup.ts'],
      testTimeout: 30000,
      env: rootEnv,
      // Run all test files sequentially in the same worker so beforeEach TRUNCATE
      // in setup.ts provides clean-slate isolation without inter-file races.
      fileParallelism: false,
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/db/seed.ts'],
    },
  };
});
