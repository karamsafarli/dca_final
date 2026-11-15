import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prismaClient ||
  new PrismaClient({
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
