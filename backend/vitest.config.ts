import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load root .env before Vitest forks any worker or runs globalSetup.
// process.cwd() when running `npm test` from backend/ is the backend directory,
// so '../.env' resolves to the monorepo root .env.
config({ path: resolve(process.cwd(), '../.env'), override: true });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globalSetup: ['src/__tests__/globalSetup.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30000,
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
});
