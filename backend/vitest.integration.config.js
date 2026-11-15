import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://crisis_user:crisis_pass@localhost:5432/urban_crisis_test?schema=public';

// Integration tests: real PostgreSQL, real Prisma transactions, real Socket.IO server.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.int.test.js'],
    environment: 'node',
    globalSetup: ['tests/helpers/globalSetup.js'],
    env: { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
