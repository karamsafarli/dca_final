import { SOS_FLOOD_CONFIG } from '../config/constants.js';
import { prisma } from '../config/db.js';

/** Zones are static reference data: cache them instead of querying per SOS. */
let cache = null;
let loading = null;

export async function getZonesCached() {
  if (cache && Date.now() - cache.at < SOS_FLOOD_CONFIG.ZONE_CACHE_TTL_MS) return cache.zones;
  if (!loading) {
    loading = prisma.zone
      .findMany({ orderBy: { id: 'asc' } })
      .then((zones) => {
        cache = { zones, at: Date.now() };
        return zones;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export function invalidateZoneCache() {
  cache = null;
}
