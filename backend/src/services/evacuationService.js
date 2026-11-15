import { CRISIS_THRESHOLDS } from '../config/constants.js';
import { prisma } from '../config/db.js';
import { calculateOccupancyPercent, findNearestZone } from './geometryService.js';
import { computeShortestPath } from './routingService.js';

/**
 * Pure evacuation evaluation logic (isolated from DB for deterministic unit testing).
 */
export function evaluateEvacuationOptions(
  origin,
  assemblyPoints,
  nodes,
  roadSegments,
  { accessibleOnly = false } = {}
) {
  const candidates = assemblyPoints
    .filter((p) => p.status === 'OPEN' || p.status === 'FULL')
    .map((point) => {
      const occupancyPercent = calculateOccupancyPercent(
        point.currentOccupancy,
        point.capacity
      );
      const isOverCapacityThreshold =
        occupancyPercent >= CRISIS_THRESHOLDS.REROUTE_OCCUPANCY_PERCENT ||
        point.status === 'FULL';
      const isInaccessibleForUser =
        accessibleOnly && point.isWheelchairAccessible === false;

      const idealRoute = computeShortestPath(origin, point, nodes, roadSegments, {
        ignoreClosures: true,
        accessibleOnly: false,
      });
      const liveRoute = computeShortestPath(origin, point, nodes, roadSegments, {
        ignoreClosures: false,
        accessibleOnly,
      });

      const closedRoadsOnIdeal = idealRoute.closedRoadsEncountered || [];
      const nonAccessibleOnIdeal = idealRoute.nonAccessibleRoadsEncountered || [];
      const isDetouredByRoadClosure =
        closedRoadsOnIdeal.length > 0 && liveRoute.reachable;
      const isBlockedByRoadClosure =
        closedRoadsOnIdeal.length > 0 && !liveRoute.reachable;

      return {
        ...point,
        occupancyPercent,
        isOverCapacityThreshold,
        isInaccessibleForUser,
        isDetouredByRoadClosure,
        isBlockedByRoadClosure,
        idealRoute,
        route: liveRoute,
      };
    });

  // Closest point under ideal road/capacity/accessibility conditions
  const sortedByIdeal = [...candidates]
    .filter((c) => c.idealRoute.reachable)
    .sort((a, b) => a.idealRoute.distanceMeters - b.idealRoute.distanceMeters);

  const idealPrimary = sortedByIdeal[0] || null;

  // Eligible points: OPEN, reachable via open (and accessible if requested) roads, < 90% full
  const eligible = candidates
    .filter(
      (c) =>
        c.status === 'OPEN' &&
        c.route.reachable &&
        !c.isOverCapacityThreshold &&
        !c.isInaccessibleForUser
    )
    .sort((a, b) => a.route.weightedCost - b.route.weightedCost);

  let recommended = eligible[0] || null;
  const rerouteReasons = [];
  let skippedCrowdedPoint = null;
  let skippedInaccessiblePoint = null;
  const blockedRoadMap = new Map();
  const avoidedInaccessibleRoadMap = new Map();

  if (idealPrimary && idealPrimary.isOverCapacityThreshold) {
    rerouteReasons.push('OCCUPANCY_THRESHOLD_90');
    skippedCrowdedPoint = {
      id: idealPrimary.id,
      name: idealPrimary.name,
      occupancyPercent: idealPrimary.occupancyPercent,
    };
  }

  if (idealPrimary && idealPrimary.isInaccessibleForUser) {
    rerouteReasons.push('ACCESSIBILITY_REQUIRED');
    skippedInaccessiblePoint = {
      id: idealPrimary.id,
      name: idealPrimary.name,
    };
  }

  if (idealPrimary && idealPrimary.idealRoute.closedRoadsEncountered.length > 0) {
    rerouteReasons.push('ROAD_CLOSURE');
    for (const r of idealPrimary.idealRoute.closedRoadsEncountered) {
      blockedRoadMap.set(r.id, r);
    }
  }

  if (
    accessibleOnly &&
    idealPrimary &&
    idealPrimary.idealRoute.nonAccessibleRoadsEncountered?.length > 0
  ) {
    if (!rerouteReasons.includes('ACCESSIBILITY_REQUIRED')) {
      rerouteReasons.push('ACCESSIBILITY_REQUIRED');
    }
    for (const r of idealPrimary.idealRoute.nonAccessibleRoadsEncountered) {
      avoidedInaccessibleRoadMap.set(r.id, r);
    }
  }

  if (recommended && recommended.isDetouredByRoadClosure) {
    if (!rerouteReasons.includes('ROAD_CLOSURE')) {
      rerouteReasons.push('ROAD_CLOSURE');
    }
    for (const r of recommended.idealRoute.closedRoadsEncountered) {
      blockedRoadMap.set(r.id, r);
    }
  }

  if (
    accessibleOnly &&
    recommended &&
    recommended.idealRoute.nonAccessibleRoadsEncountered?.length > 0
  ) {
    if (!rerouteReasons.includes('ACCESSIBILITY_REQUIRED')) {
      rerouteReasons.push('ACCESSIBILITY_REQUIRED');
    }
    for (const r of recommended.idealRoute.nonAccessibleRoadsEncountered) {
      avoidedInaccessibleRoadMap.set(r.id, r);
    }
  }

  // Fallback if all eligible open points are >= 90%
  if (!recommended) {
    const reachableFallback = candidates
      .filter(
        (c) =>
          c.status === 'OPEN' && c.route.reachable && !c.isInaccessibleForUser
      )
      .sort((a, b) => a.occupancyPercent - b.occupancyPercent);
    recommended = reachableFallback[0] || null;
    if (recommended && !rerouteReasons.includes('ALL_POINTS_HIGH_OCCUPANCY')) {
      rerouteReasons.push('ALL_POINTS_HIGH_OCCUPANCY');
    }
  }

  const orderedPoints = [...candidates].sort((a, b) => {
    if (recommended && a.id === recommended.id) return -1;
    if (recommended && b.id === recommended.id) return 1;
    if (a.isInaccessibleForUser !== b.isInaccessibleForUser) {
      return a.isInaccessibleForUser ? 1 : -1;
    }
    const distA = a.route.reachable ? a.route.distanceMeters : a.idealRoute.distanceMeters;
    const distB = b.route.reachable ? b.route.distanceMeters : b.idealRoute.distanceMeters;
    return distA - distB;
  });

  return {
    origin,
    accessibleOnly,
    recommendedPoint: recommended,
    rerouted: rerouteReasons.length > 0,
    rerouteReasons,
    skippedCrowdedPoint,
    skippedInaccessiblePoint,
    blockedRoads: Array.from(blockedRoadMap.values()),
    avoidedInaccessibleRoads: Array.from(avoidedInaccessibleRoadMap.values()),
    idealBlockedPolyline:
      rerouteReasons.length > 0 && idealPrimary
        ? idealPrimary.idealRoute.polyline
        : null,
    assemblyPoints: orderedPoints.map(({ idealRoute, ...rest }) => ({
      ...rest,
      isRecommended: recommended ? rest.id === recommended.id : false,
    })),
  };
}

/**
 * Resolve origin coordinates from zoneId or explicit lat/lng and compute evacuation plan.
 */
export async function getEvacuationPlan({
  zoneId,
  lat,
  lng,
  accessibleOnly = false,
  citizenCategory = 'STANDARD',
}) {
  const [zones, assemblyPoints, nodes, roadSegments] = await Promise.all([
    prisma.zone.findMany({ orderBy: { id: 'asc' } }),
    prisma.assemblyPoint.findMany({
      include: { zone: true },
      orderBy: { id: 'asc' },
    }),
    prisma.roadNode.findMany(),
    prisma.roadSegment.findMany({ orderBy: { id: 'asc' } }),
  ]);

  let selectedZone = zoneId
    ? zones.find((z) => z.id === Number(zoneId)) || null
    : null;

  let originLat = lat !== undefined && lat !== null ? Number(lat) : null;
  let originLng = lng !== undefined && lng !== null ? Number(lng) : null;

  if (originLat === null || originLng === null) {
    if (!selectedZone) {
      selectedZone = zones[0] || null;
    }
    originLat = selectedZone ? selectedZone.centerLat : 40.379;
    originLng = selectedZone ? selectedZone.centerLng : 49.835;
  } else if (!selectedZone) {
    selectedZone = findNearestZone(originLat, originLng, zones);
  }

  const requireAccessible =
    accessibleOnly === true ||
    accessibleOnly === 'true' ||
    citizenCategory === 'SPECIAL_CARE';

  const result = evaluateEvacuationOptions(
    { lat: originLat, lng: originLng },
    assemblyPoints,
    nodes,
    roadSegments,
    { accessibleOnly: requireAccessible }
  );

  return {
    selectedZone,
    ...result,
    roads: roadSegments,
  };
}
