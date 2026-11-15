import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../../src/resilience/circuitBreaker.js';
import { RouteCache, roadStateFingerprint } from '../../src/resilience/routeCache.js';
import { RoutingGateway, RoutingMode } from '../../src/services/routingGateway.js';

const NODES = [
  { id: 1, lat: 40.375, lng: 49.815 },
  { id: 2, lat: 40.383, lng: 49.815 },
];
const roads = (status = 'OPEN') => [
  {
    id: 10,
    code: 'R1',
    name: 'Prospekt',
    fromNodeId: 1,
    toNodeId: 2,
    distanceMeters: 890,
    status,
    isWheelchairAccessible: true,
    waypoints: [
      [40.375, 49.815],
      [40.383, 49.815],
    ],
  },
];
const POINTS = [{ id: 7, nodeId: 2, lat: 40.383, lng: 49.815 }];
const ORIGIN = { lat: 40.3749, lng: 49.8149 };

const externalRoute = {
  reachable: true,
  distanceMeters: 900,
  weightedCost: 900,
  estimatedMinutes: 12,
  polyline: [
    [1, 1],
    [2, 2],
  ],
  roadIdsUsed: [10],
  roadNamesUsed: ['External Route'],
  closedRoadsEncountered: [],
  nonAccessibleRoadsEncountered: [],
  hasCongestion: false,
};

function makeGateway(routeMatrix, breakerOpts = {}) {
  const client = { routeMatrix: vi.fn(routeMatrix), health: vi.fn() };
  const breaker = new CircuitBreaker({ timeoutMs: 50, failureThreshold: 2, openDurationMs: 60000, ...breakerOpts });
  const gateway = new RoutingGateway({ client, breaker, cache: new RouteCache() });
  return { gateway, client };
}

const healthy = async () => new Map([[7, externalRoute]]);
const down = async () => {
  throw Object.assign(new Error('HTTP 503'), { code: 'EXTERNAL_UNAVAILABLE' });
};

const resolve = (gateway, roadList = roads()) =>
  gateway.resolveRouteSets({ origin: ORIGIN, points: POINTS, nodes: NODES, roads: roadList });

describe('RoutingGateway — Circuit Breaker / Fallback (Challenge Drop #2)', () => {
  it('serves external routes in ONLINE mode', async () => {
    const { gateway, client } = makeGateway(healthy);
    const res = await resolve(gateway);
    expect(res.routing).toMatchObject({ mode: RoutingMode.ONLINE, degraded: false });
    expect(res.live.get(7).roadNamesUsed).toEqual(['External Route']);
    expect(client.routeMatrix).toHaveBeenCalledTimes(2); // ideal + live
  });

  it('falls back to the local road graph on HTTP 503 and never throws', async () => {
    const { gateway } = makeGateway(down);
    const res = await resolve(gateway);
    expect(res.routing).toMatchObject({
      mode: RoutingMode.FALLBACK_LOCAL_GRAPH,
      degraded: true,
      reason: 'EXTERNAL_UNAVAILABLE',
      provider: 'local-road-graph',
    });
    expect(res.live.get(7).reachable).toBe(true);
    expect(res.live.get(7).roadNamesUsed).toContain('Prospekt');
  });

  it('treats > timeout responses as failures (EXTERNAL_TIMEOUT) and answers quickly', async () => {
    const slow = () => new Promise((r) => setTimeout(() => r(new Map()), 1000));
    const { gateway } = makeGateway(slow);
    const started = Date.now();
    const res = await resolve(gateway);
    expect(Date.now() - started).toBeLessThan(500);
    expect(res.routing.reason).toBe('EXTERNAL_TIMEOUT');
    expect(res.routing.degraded).toBe(true);
  });

  it('reuses the last cached external routes when the road state is unchanged', async () => {
    let fn = healthy;
    const { gateway } = makeGateway((...a) => fn(...a));
    await resolve(gateway);
    fn = down;
    const res = await resolve(gateway);
    expect(res.routing.mode).toBe(RoutingMode.FALLBACK_CACHE);
    expect(res.routing.cachedAt).toBeTruthy();
    expect(res.live.get(7).roadNamesUsed).toEqual(['External Route']);
  });

  it('never serves a cached route after a road changed status (computes locally instead)', async () => {
    let fn = healthy;
    const { gateway } = makeGateway((...a) => fn(...a));
    await resolve(gateway, roads('OPEN'));
    fn = down;
    const res = await resolve(gateway, roads('CLOSED'));
    expect(res.routing.mode).toBe(RoutingMode.FALLBACK_LOCAL_GRAPH);
    expect(res.live.get(7).reachable).toBe(false);
  });

  it('uses the static coordinate matrix (straight line) when no local graph exists', async () => {
    const { gateway } = makeGateway(down);
    const res = await gateway.resolveRouteSets({ origin: ORIGIN, points: POINTS, nodes: [], roads: [] });
    expect(res.routing.mode).toBe(RoutingMode.FALLBACK_STRAIGHT_LINE);
    expect(res.live.get(7).polyline).toHaveLength(2);
  });

  it('stops calling the dead API once the circuit is open (CIRCUIT_OPEN)', async () => {
    const { gateway, client } = makeGateway(down);
    await resolve(gateway);
    await resolve(gateway);
    const callsBefore = client.routeMatrix.mock.calls.length;
    const res = await resolve(gateway);
    expect(res.routing.reason).toBe('CIRCUIT_OPEN');
    expect(client.routeMatrix.mock.calls.length).toBe(callsBefore);
  });

  it('emits status events when entering and leaving degraded mode', async () => {
    let fn = down;
    const { gateway } = makeGateway((...a) => fn(...a));
    const modes = [];
    gateway.on('status', (s) => modes.push(s.mode));
    await resolve(gateway);
    fn = healthy;
    gateway.reset();
    expect(modes).toContain(RoutingMode.FALLBACK_LOCAL_GRAPH);
    expect(modes.at(-1)).toBe(RoutingMode.ONLINE);
  });
});

describe('roadStateFingerprint', () => {
  it('changes when a road status or accessibility changes', () => {
    expect(roadStateFingerprint(roads('OPEN'))).not.toBe(roadStateFingerprint(roads('CLOSED')));
    const r = roads();
    const inaccessible = [{ ...r[0], isWheelchairAccessible: false }];
    expect(roadStateFingerprint(r)).not.toBe(roadStateFingerprint(inaccessible));
  });

  it('expires cache entries after the TTL', () => {
    let t = 0;
    const cache = new RouteCache({ ttlMs: 100, now: () => t });
    cache.set('k', 1);
    t = 50;
    expect(cache.get('k')?.value).toBe(1);
    t = 151;
    expect(cache.get('k')).toBeNull();
  });
});
