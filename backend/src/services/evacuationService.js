import { CRISIS_THRESHOLDS } from '../config/constants.js';
import { prisma } from '../config/db.js';
import { calculateOccupancyPercent, findNearestZone } from './geometryService.js';
import { getRoutingGateway } from './routingGateway.js';
import { computeLocalRouteSets } from './routingService.js';

const UNREACHABLE_ROUTE = Object.freeze({
  reachable: false,
  weightedCost: Infinity,
  distanceMeters: Infinity,
  estimatedMinutes: null,
  polyline: [],
  roadIdsUsed: [],
  roadNamesUsed: [],
  closedRoadsEncountered: [],
  nonAccessibleRoadsEncountered: [],
  hasCongestion: false,
});

/** Assembly points that can receive evacuees (FULL kept to explain reroutes). */
export const isCandidatePoint = (p) => p.status === 'OPEN' || p.status === 'FULL';

/**
 * Convenience wrapper: local routing + decision logic in one pure call.
 */
export function evaluateEvacuationOptions(
  origin,
  assemblyPoints,
  nodes,
  roadSegments,
  { accessibleOnly = false } = {}
) {
  const routeSets = computeLocalRouteSets(
    origin,
    assemblyPoints.filter(isCandidatePoint),
    nodes,
    roadSegments,
    { accessibleOnly }
  );
  return rankEvacuationOptions(origin, assemblyPoints, routeSets, { accessibleOnly });
}

/**
 * Pure evacuation decision logic. Independent of *where* routes came from
 * (external API, cache, local graph), so the 90% / road-closure / accessibility
 * rules behave identically in online and offline mode.
 */
export function rankEvacuationOptions(
  origin,
  assemblyPoints,
  { ideal, live },
  { accessibleOnly = false } = {}
) {
  const candidates = assemblyPoints
    .filter(isCandidatePoint)
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

      const idealRoute = ideal.get(point.id) || UNREACHABLE_ROUTE;
      const liveRoute = live.get(point.id) || UNREACHABLE_ROUTE;

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

  // Nobody should get an empty screen: if no point can be reached on foot
  // (or step-free for special-care citizens), say so explicitly so the UI can
  // offer a one-click Priority #1 medical-transport request instead.
  let assistanceRequired = null;
  if (!recommended) {
    assistanceRequired = accessibleOnly ? 'NO_ACCESSIBLE_ROUTE' : 'NO_REACHABLE_POINT';
    rerouteReasons.push(assistanceRequired);
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
    assistanceRequired,
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

  const origin = { lat: originLat, lng: originLng };
  const { ideal, live, routing } = await getRoutingGateway().resolveRouteSets({
    origin,
    points: assemblyPoints.filter(isCandidatePoint),
    accessibleOnly: requireAccessible,
    nodes,
    roads: roadSegments,
  });

  const result = rankEvacuationOptions(origin, assemblyPoints, { ideal, live }, {
    accessibleOnly: requireAccessible,
  });

  return {
    selectedZone,
    ...result,
    routing,
    roads: roadSegments,
  };
}
