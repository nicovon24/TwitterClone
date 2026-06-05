import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globalSetup: ['src/__tests__/globalSetup.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30000,
    // Run all test files in a single worker so module-level db client is
    // initialised only once (after globalSetup has set DATABASE_URL).
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
});
