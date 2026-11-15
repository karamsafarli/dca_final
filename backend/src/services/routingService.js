import { CRISIS_THRESHOLDS } from '../config/constants.js';
import {
  estimateTravelMinutes,
  haversineDistanceMeters,
} from './geometryService.js';

/**
 * Normalize waypoints into an array of [lat, lng] coordinate pairs.
 */
function normalizeWaypoints(waypoints, fromNode, toNode) {
  if (Array.isArray(waypoints) && waypoints.length >= 2) {
    return waypoints;
  }
  return [
    [fromNode.lat, fromNode.lng],
    [toNode.lat, toNode.lng],
  ];
}

/**
 * Append coordinates while avoiding duplicate consecutive vertices.
 */
function appendPolylinePoints(target, points) {
  for (const pt of points) {
    const prev = target[target.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) {
      target.push(pt);
    }
  }
}

/**
 * Find the K nearest graph nodes to a coordinate, sorted ascending by distance.
 */
function findNearestNodes(lat, lng, nodes, limit = 3) {
  return nodes
    .map((node) => ({
      node,
      distanceMeters: haversineDistanceMeters(lat, lng, node.lat, node.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

/**
 * Compute shortest evacuation path from an origin coordinate to an assembly point
 * using Dijkstra over the city road segment graph.
 */
export function computeShortestPath(
  origin,
  destination,
  nodes,
  roadSegments,
  { ignoreClosures = false, accessibleOnly = false } = {}
) {
  if (!nodes.length) {
    const directMeters = haversineDistanceMeters(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    return {
      reachable: true,
      weightedCost: directMeters,
      distanceMeters: directMeters,
      estimatedMinutes: estimateTravelMinutes(directMeters),
      polyline: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      roadIdsUsed: [],
      roadNamesUsed: [],
      closedRoadsEncountered: [],
      nonAccessibleRoadsEncountered: [],
      hasCongestion: false,
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map();

  for (const n of nodes) {
    adjacency.set(n.id, []);
  }

  for (const seg of roadSegments) {
    if (!ignoreClosures && seg.status === 'CLOSED') {
      continue;
    }
    if (accessibleOnly && seg.isWheelchairAccessible === false) {
      continue;
    }

    const fromNode = nodeMap.get(seg.fromNodeId);
    const toNode = nodeMap.get(seg.toNodeId);
    if (!fromNode || !toNode) continue;

    const penalty =
      seg.status === 'CONGESTED' ? CRISIS_THRESHOLDS.CONGESTED_ROAD_PENALTY : 1;
    const weight = seg.distanceMeters * penalty;
    const forwardPts = normalizeWaypoints(seg.waypoints, fromNode, toNode);
    const reversePts = [...forwardPts].reverse();

    adjacency.get(seg.fromNodeId).push({
      to: seg.toNodeId,
      weight,
      distanceMeters: seg.distanceMeters,
      road: seg,
      points: forwardPts,
    });

    adjacency.get(seg.toNodeId).push({
      to: seg.fromNodeId,
      weight,
      distanceMeters: seg.distanceMeters,
      road: seg,
      points: reversePts,
    });
  }

  const START_KEY = 'START';
  const END_KEY = 'END';

  const dist = new Map([[START_KEY, 0]]);
  const prev = new Map();
  const visited = new Set();

  // Priority queue implemented cleanly via sorted insertion array (graph has ~20-100 nodes)
  const queue = [{ key: START_KEY, cost: 0 }];

  // Snap origin to nearest intersection that still has at least one traversable road
  const startNodeCandidates = findNearestNodes(origin.lat, origin.lng, nodes, nodes.length);
  const startNodeMatch =
    startNodeCandidates.find((c) => (adjacency.get(c.node.id) || []).length > 0) ||
    startNodeCandidates[0];
  const startLinks = startNodeMatch ? [startNodeMatch] : [];

  const endLinks =
    destination.nodeId && nodeMap.has(destination.nodeId)
      ? [
          {
            node: nodeMap.get(destination.nodeId),
            distanceMeters: haversineDistanceMeters(
              nodeMap.get(destination.nodeId).lat,
              nodeMap.get(destination.nodeId).lng,
              destination.lat,
              destination.lng
            ),
          },
        ]
      : findNearestNodes(destination.lat, destination.lng, nodes, 1);

  const endLinkMap = new Map(endLinks.map((l) => [l.node.id, l.distanceMeters]));

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    if (visited.has(current.key)) continue;
    visited.add(current.key);

    if (current.key === END_KEY) break;

    if (current.key === START_KEY) {
      for (const link of startLinks) {
        const nextCost = current.cost + link.distanceMeters;
        if (nextCost < (dist.get(link.node.id) ?? Infinity)) {
          dist.set(link.node.id, nextCost);
          prev.set(link.node.id, {
            from: START_KEY,
            distanceMeters: link.distanceMeters,
            road: null,
            points: [
              [origin.lat, origin.lng],
              [link.node.lat, link.node.lng],
            ],
          });
          queue.push({ key: link.node.id, cost: nextCost });
        }
      }
      continue;
    }

    const nodeId = current.key;

    if (endLinkMap.has(nodeId)) {
      const tailDist = endLinkMap.get(nodeId);
      const nextCost = current.cost + tailDist;
      if (nextCost < (dist.get(END_KEY) ?? Infinity)) {
        const nodeObj = nodeMap.get(nodeId);
        dist.set(END_KEY, nextCost);
        prev.set(END_KEY, {
          from: nodeId,
          distanceMeters: tailDist,
          road: null,
          points: [
            [nodeObj.lat, nodeObj.lng],
            [destination.lat, destination.lng],
          ],
        });
        queue.push({ key: END_KEY, cost: nextCost });
      }
    }

    for (const edge of adjacency.get(nodeId) || []) {
      if (visited.has(edge.to)) continue;
      const nextCost = current.cost + edge.weight;
      if (nextCost < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, nextCost);
        prev.set(edge.to, {
          from: nodeId,
          distanceMeters: edge.distanceMeters,
          road: edge.road,
          points: edge.points,
        });
        queue.push({ key: edge.to, cost: nextCost });
      }
    }
  }

  if (!dist.has(END_KEY)) {
    return {
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
    };
  }

  const steps = [];
  let cursor = END_KEY;
  while (cursor !== START_KEY) {
    const step = prev.get(cursor);
    if (!step) break;
    steps.push(step);
    cursor = step.from;
  }
  steps.reverse();

  const polyline = [];
  let totalMeters = 0;
  const roadIdsUsed = [];
  const roadNamesUsed = [];
  const closedRoadsEncountered = [];
  const nonAccessibleRoadsEncountered = [];
  let hasCongestion = false;

  for (const step of steps) {
    totalMeters += step.distanceMeters;
    appendPolylinePoints(polyline, step.points);
    if (step.road) {
      roadIdsUsed.push(step.road.id);
      roadNamesUsed.push(step.road.name);
      if (step.road.status === 'CLOSED') {
        closedRoadsEncountered.push({
          id: step.road.id,
          code: step.road.code,
          name: step.road.name,
          closureReason: step.road.closureReason,
        });
      }
      if (step.road.isWheelchairAccessible === false) {
        nonAccessibleRoadsEncountered.push({
          id: step.road.id,
          code: step.road.code,
          name: step.road.name,
          accessibilityNotes: step.road.accessibilityNotes,
        });
      }
      if (step.road.status === 'CONGESTED') {
        hasCongestion = true;
      }
    }
  }

  return {
    reachable: true,
    weightedCost: dist.get(END_KEY),
    distanceMeters: Math.round(totalMeters),
    estimatedMinutes: estimateTravelMinutes(totalMeters),
    polyline,
    roadIdsUsed,
    roadNamesUsed,
    closedRoadsEncountered,
    nonAccessibleRoadsEncountered,
    hasCongestion,
  };
}

/**
 * Local routing engine over the backup road graph stored in our own database
 * (nodes = static coordinate matrix, segments = road graph). Used as the
 * fallback when the external routing API is unavailable. With an empty graph,
 * computeShortestPath degrades further to straight-line (haversine) distances.
 *
 * ideal: shortest path ignoring closures (to explain *why* we rerouted)
 * live:  path over currently open (and, if required, wheelchair-accessible) roads
 */
export function computeLocalRouteSets(origin, points, nodes, roadSegments, { accessibleOnly = false } = {}) {
  const ideal = new Map();
  const live = new Map();
  for (const point of points) {
    ideal.set(
      point.id,
      computeShortestPath(origin, point, nodes, roadSegments, {
        ignoreClosures: true,
        accessibleOnly: false,
      })
    );
    live.set(
      point.id,
      computeShortestPath(origin, point, nodes, roadSegments, {
        ignoreClosures: false,
        accessibleOnly,
      })
    );
  }
  return { ideal, live };
}
