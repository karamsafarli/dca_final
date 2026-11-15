import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

/**
 * A bigger, explicit connection pool: under an SOS flood the default
 * (CPU*2+1) is the first bottleneck. Respects an explicit connection_limit.
 */
export function withPoolSettings(url, size = process.env.PRISMA_POOL_SIZE || 40) {
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=${size}&pool_timeout=10`;
}

export const prisma =
  globalForPrisma.__prismaClient ||
  new PrismaClient({
    datasourceUrl: withPoolSettings(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Secrets are never selected unless a query explicitly opts in.
    omit: {
      sosSignal: { accessTokenHash: true },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

/**
 * Serialize concurrent work on the same logical resource for the lifetime of
 * the surrounding transaction (PostgreSQL transaction-level advisory lock).
 */
export async function lockKey(tx, key) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
