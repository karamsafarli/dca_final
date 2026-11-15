import { conflict, notFound } from '../utils/errors.js';

export const FREE_BRIGADE_STATUSES = ['AVAILABLE', 'STANDBY'];

/**
 * Pure ranking of free brigades for a mission:
 * same zone first, then preferred unit types (e.g. MEDICAL for Priority #1),
 * then AVAILABLE before STANDBY reserves, then lowest id for determinism.
 */
export function rankBrigades(brigades, { zoneId, preferUnitTypes = [] } = {}) {
  const score = (b) => [
    b.zoneId === zoneId ? 0 : 1,
    preferUnitTypes.includes(b.unitType) ? 0 : 1,
    b.status === 'AVAILABLE' ? 0 : 1,
    b.id,
  ];
  return [...brigades].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i += 1) {
      if (sa[i] !== sb[i]) return sa[i] - sb[i];
    }
    return 0;
  });
}

/**
 * Atomically claim a free brigade inside a transaction.
 * The conditional `updateMany(status IN free)` is the lock: if a concurrent
 * transaction claimed the same brigade first, PostgreSQL re-checks the WHERE
 * clause after its commit and we get count = 0, so we move to the next candidate.
 */
export async function claimBrigade(tx, { brigadeId, zoneId, preferUnitTypes, data }) {
  const claim = async (id) => {
    const { count } = await tx.rescueBrigade.updateMany({
      where: { id, status: { in: FREE_BRIGADE_STATUSES } },
      data: { ...data, status: 'DISPATCHED' },
    });
    return count === 1 ? tx.rescueBrigade.findUnique({ where: { id } }) : null;
  };

  if (brigadeId) {
    const claimed = await claim(Number(brigadeId));
    if (claimed) return claimed;
    const exists = await tx.rescueBrigade.findUnique({ where: { id: Number(brigadeId) } });
    if (!exists) throw notFound('BRIGADE_NOT_FOUND', 'Rescue brigade not found');
    throw conflict('BRIGADE_BUSY', 'Rescue brigade is already on a mission');
  }

  const free = await tx.rescueBrigade.findMany({
    where: { status: { in: FREE_BRIGADE_STATUSES } },
  });
  for (const candidate of rankBrigades(free, { zoneId, preferUnitTypes })) {
    const claimed = await claim(candidate.id);
    if (claimed) return claimed;
  }
  return null;
}
