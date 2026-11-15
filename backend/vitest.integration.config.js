import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://crisis_user:crisis_pass@localhost:5432/urban_crisis_test?schema=public';

// Integration tests: real PostgreSQL, real Prisma transactions, real Socket.IO server.
// `npm run test:coverage` sets VITEST_ALL=1 to run unit + integration together
// and report one combined coverage figure.
const runAll = process.env.VITEST_ALL === '1';

export default defineConfig({
  test: {
    include: runAll
      ? ['tests/unit/**/*.test.js', 'tests/integration/**/*.int.test.js']
      : ['tests/integration/**/*.int.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/index.js', 'src/external/routingApiServer.js', 'src/db/seedData.js'],
      reporter: ['text-summary', 'text', 'html', 'json-summary'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
    environment: 'node',
    globalSetup: ['tests/helpers/globalSetup.js'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      // Scenario tests send many SOS from one test client; limits are tested separately
      SOS_RATE_LIMIT_PER_MIN: '10000',
      // Deterministic assertions on `triggeredAlert`; the budget itself is unit-tested
      SOS_EVALUATION_BUDGET_MS: '5000',
    },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
