import { execSync } from 'node:child_process';

/**
 * Sync the Prisma schema into the dedicated test database once per run.
 * Refuses to run against anything that does not look like a test database.
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ||
    'postgresql://crisis_user:crisis_pass@localhost:5432/urban_crisis_test?schema=public';

  if (!/_test\b|_test\?/.test(url)) {
    throw new Error(`Refusing to reset non-test database: ${url}`);
  }

  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
