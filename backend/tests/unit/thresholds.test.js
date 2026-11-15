import { describe, expect, it } from 'vitest';
import { CRISIS_THRESHOLDS } from '../../src/config/constants.js';
import {
  clusterWindowStart,
  detectCapacityOverflow,
  detectSosCluster,
} from '../../src/services/crisisEngineService.js';
import { evaluateEvacuationOptions } from '../../src/services/evacuationService.js';
import { haversineDistanceMeters } from '../../src/services/geometryService.js';

/**
 * Boundary-value tests for every number in task.txt:
 * 4 SOS, 500 m, 5 min, 90 % reroute, > 95 % Red Alert.
 */
describe('Task thresholds are exactly as specified', () => {
  it('uses the values required by task.txt', () => {
    expect(CRISIS_THRESHOLDS).toMatchObject({
      SOS_CLUSTER_MIN_COUNT: 4,
      SOS_CLUSTER_RADIUS_METERS: 500,
      SOS_CLUSTER_WINDOW_MINUTES: 5,
      REROUTE_OCCUPANCY_PERCENT: 90,
      CRITICAL_OCCUPANCY_PERCENT: 95,
    });
  });
});

describe('500 m radius boundary', () => {
  const center = { id: 100, citizenCode: 'C0', zoneId: 1, lat: 40.4, lng: 49.85 };
  // 1° latitude ≈ 111 195 m on the haversine sphere used by the engine
  const atMeters = (m, i) => ({
    id: i,
    citizenCode: `C${i}`,
    zoneId: 100 + i, // different zones: only the radius rule can trigger
    lat: center.lat + m / 111195,
    lng: center.lng,
  });

  it('counts a signal at exactly 500 m and ignores one at 501 m', () => {
    expect(haversineDistanceMeters(center.lat, center.lng, atMeters(500, 1).lat, center.lng)).toBe(500);
    expect(haversineDistanceMeters(center.lat, center.lng, atMeters(501, 1).lat, center.lng)).toBe(501);

    const inside = [center, atMeters(100, 1), atMeters(300, 2), atMeters(500, 3)];
    expect(detectSosCluster(center, inside)?.triggeredByRadius).toBe(true);

    const oneOutside = [center, atMeters(100, 1), atMeters(300, 2), atMeters(501, 3)];
    expect(detectSosCluster(center, oneOutside)).toBeNull();
  });
});

describe('5-minute window boundary', () => {
  it('starts exactly 5 minutes before now', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    expect(clusterWindowStart(now, null).toISOString()).toBe('2026-01-01T11:55:00.000Z');
  });
});

describe('> 95 % Red Alert boundary', () => {
  it('95.0 % does not trigger, 95.2 % does', () => {
    expect(detectCapacityOverflow(950, 1000)).toBeNull();
    expect(detectCapacityOverflow(952, 1000)).toEqual({ occupancyPercent: 95.2 });
  });

  it('a zero-capacity point is treated as full', () => {
    expect(detectCapacityOverflow(0, 0)).toEqual({ occupancyPercent: 100 });
  });
});

describe('90 % reroute boundary', () => {
  const nodes = [
    { id: 1, lat: 40.375, lng: 49.815 },
    { id: 2, lat: 40.383, lng: 49.815 },
    { id: 3, lat: 40.383, lng: 49.825 },
  ];
  const roads = [
    { id: 1, name: 'A', fromNodeId: 1, toNodeId: 2, distanceMeters: 890, status: 'OPEN', waypoints: null },
    { id: 2, name: 'B', fromNodeId: 2, toNodeId: 3, distanceMeters: 850, status: 'OPEN', waypoints: null },
  ];
  const points = (nearOccupancy) => [
    { id: 1, name: 'Near', type: 'SHELTER', nodeId: 2, lat: 40.383, lng: 49.815, capacity: 1000, currentOccupancy: nearOccupancy, status: 'OPEN' },
    { id: 2, name: 'Far', type: 'PARK', nodeId: 3, lat: 40.383, lng: 49.825, capacity: 1000, currentOccupancy: 100, status: 'OPEN' },
  ];
  const origin = { lat: 40.3749, lng: 49.8149 };

  it('89.9 % keeps the nearest point', () => {
    const plan = evaluateEvacuationOptions(origin, points(899), nodes, roads);
    expect(plan.recommendedPoint.id).toBe(1);
    expect(plan.rerouted).toBe(false);
  });

  it('exactly 90 % reroutes to the alternative point', () => {
    const plan = evaluateEvacuationOptions(origin, points(900), nodes, roads);
    expect(plan.recommendedPoint.id).toBe(2);
    expect(plan.rerouteReasons).toContain('OCCUPANCY_THRESHOLD_90');
  });

  it('a CONGESTED road is penalised but still usable', () => {
    const congested = roads.map((r) => (r.id === 1 ? { ...r, status: 'CONGESTED' } : r));
    const plan = evaluateEvacuationOptions(origin, points(100), nodes, congested);
    expect(plan.recommendedPoint.route.reachable).toBe(true);
    expect(plan.recommendedPoint.route.hasCongestion).toBe(true);
  });
});

describe('Challenge Drop #2 timeout', () => {
  it('treats routing API responses slower than 5 seconds as failures by default', async () => {
    const { ROUTING_CONFIG } = await import('../../src/config/constants.js');
    expect(process.env.ROUTING_API_TIMEOUT_MS).toBeUndefined();
    expect(ROUTING_CONFIG.TIMEOUT_MS).toBe(5000);
  });
});
