const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate great-circle distance in meters between two WGS84 coordinates.
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Calculate occupancy percentage rounded to 1 decimal place.
 */
export function calculateOccupancyPercent(currentOccupancy, capacity) {
  if (!capacity || capacity <= 0) return 100;
  return Number(((currentOccupancy / capacity) * 100).toFixed(1));
}

/**
 * Estimate walking/evacuation ETA in minutes (average 4.5 km/h = 75 m/min under urban crisis).
 */
export function estimateTravelMinutes(distanceMeters) {
  if (!distanceMeters || distanceMeters <= 0) return 1;
  return Math.max(1, Math.ceil(distanceMeters / 75));
}

/**
 * Find the closest zone to a given coordinate.
 */
export function findNearestZone(lat, lng, zones) {
  if (!zones?.length) return null;
  let best = zones[0];
  let bestDist = haversineDistanceMeters(lat, lng, best.centerLat, best.centerLng);

  for (let i = 1; i < zones.length; i += 1) {
    const z = zones[i];
    const dist = haversineDistanceMeters(lat, lng, z.centerLat, z.centerLng);
    if (dist < bestDist) {
      best = z;
      bestDist = dist;
    }
  }
  return best;
}
