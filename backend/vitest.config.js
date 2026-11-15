import { defineConfig } from 'vitest/config';

// Unit tests: pure logic + HTTP layer checks that never touch the database.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    env: { NODE_ENV: 'test' },
  },
});
