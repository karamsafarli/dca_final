import { prisma } from '../config/db.js';
import { invalidateZoneCache } from '../services/zoneCache.js';
import {
  SEED_ASSEMBLY_POINTS,
  SEED_ROADS,
  ensureDispatchersSeeded,
  seedDatabase,
} from './seedData.js';

/**
 * Sync accessibility metadata onto existing DB records when migrating an older volume.
 */
async function syncAccessibilityFlags() {
  const nonAccessibleRoads = await prisma.roadSegment.count({
    where: { isWheelchairAccessible: false },
  });
  if (nonAccessibleRoads === 0) {
    for (const r of SEED_ROADS) {
      if (r.isWheelchairAccessible === false) {
        await prisma.roadSegment.updateMany({
          where: { code: r.code },
          data: {
            isWheelchairAccessible: false,
            accessibilityNotes: r.accessibilityNotes || null,
          },
        });
      }
    }
    for (const ap of SEED_ASSEMBLY_POINTS) {
      if (ap.isWheelchairAccessible === false) {
        await prisma.assemblyPoint.updateMany({
          where: { code: ap.code },
          data: { isWheelchairAccessible: false },
        });
      }
    }
  }
}

/**
 * Seed initial Baku crisis network and default dispatchers automatically if missing.
 */
export async function ensureDatabaseSeeded() {
  await ensureDispatchersSeeded(prisma);
  const count = await prisma.zone.count();
  if (count === 0) {
    console.log('Empty database detected. Seeding initial Baku crisis data...');
    await seedDatabase(prisma);
    invalidateZoneCache();
    console.log('Initial seed completed.');
  } else {
    await syncAccessibilityFlags();
  }
}
