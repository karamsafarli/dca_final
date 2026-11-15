import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  hashPassword,
  signDispatcherToken,
  verifyDispatcherToken,
  verifyPassword,
} from '../../src/services/authService.js';
import {
  detectCapacityOverflow,
  detectSosCluster,
} from '../../src/services/crisisEngineService.js';
import { evaluateEvacuationOptions } from '../../src/services/evacuationService.js';
import {
  calculateOccupancyPercent,
  haversineDistanceMeters,
} from '../../src/services/geometryService.js';
import { computeShortestPath } from '../../src/services/routingService.js';

const MOCK_NODES = [
  { id: 1, code: 'N1', name: 'Node 1', zoneId: 1, lat: 40.375, lng: 49.815 },
  { id: 2, code: 'N2', name: 'Node 2', zoneId: 1, lat: 40.383, lng: 49.815 },
  { id: 3, code: 'N3', name: 'Node 3', zoneId: 1, lat: 40.383, lng: 49.825 },
  { id: 4, code: 'N4', name: 'Node 4', zoneId: 1, lat: 40.375, lng: 49.825 },
];

const buildMockRoads = (primaryClosed = false, primaryNonAccessible = false) => [
  {
    id: 10,
    code: 'R_DIRECT',
    name: 'Birbaşa Prospekt',
    zoneId: 1,
    fromNodeId: 1,
    toNodeId: 2,
    distanceMeters: 890,
    status: primaryClosed ? 'CLOSED' : 'OPEN',
    isWheelchairAccessible: !primaryNonAccessible,
    accessibilityNotes: primaryNonAccessible ? 'Pilləkənli keçid' : null,
    closureReason: primaryClosed ? 'Dağıntı səbəbilə bağlanıb' : null,
    waypoints: [
      [40.375, 49.815],
      [40.383, 49.815],
    ],
  },
  {
    id: 11,
    code: 'R_DETOUR_1',
    name: 'Yan Dəhliz 1',
    zoneId: 1,
    fromNodeId: 1,
    toNodeId: 4,
    distanceMeters: 850,
    status: 'OPEN',
    isWheelchairAccessible: true,
    waypoints: [
      [40.375, 49.815],
      [40.375, 49.825],
    ],
  },
  {
    id: 12,
    code: 'R_DETOUR_2',
    name: 'Yan Dəhliz 2',
    zoneId: 1,
    fromNodeId: 4,
    toNodeId: 3,
    distanceMeters: 890,
    status: 'OPEN',
    isWheelchairAccessible: true,
    waypoints: [
      [40.375, 49.825],
      [40.383, 49.825],
    ],
  },
  {
    id: 13,
    code: 'R_DETOUR_3',
    name: 'Yan Dəhliz 3',
    zoneId: 1,
    fromNodeId: 3,
    toNodeId: 2,
    distanceMeters: 850,
    status: 'OPEN',
    isWheelchairAccessible: true,
    waypoints: [
      [40.383, 49.825],
      [40.383, 49.815],
    ],
  },
];

describe('Geometry helpers', () => {
  it('computes accurate Haversine distance in meters', () => {
    const zero = haversineDistanceMeters(40.375, 49.815, 40.375, 49.815);
    expect(zero).toBe(0);

    // ~0.004 deg lat is ~445 meters (< 500m radius)
    const under500 = haversineDistanceMeters(40.375, 49.815, 40.379, 49.815);
    expect(under500).toBeGreaterThan(400);
    expect(under500).toBeLessThan(500);
  });

  it('computes occupancy percent properly', () => {
    expect(calculateOccupancyPercent(450, 500)).toBe(90);
    expect(calculateOccupancyPercent(480, 500)).toBe(96);
  });
});

describe('Evacuation & Dijkstra Rerouting Engine', () => {
  const origin = { lat: 40.3749, lng: 49.8149 };

  it('chooses direct shortest road when all roads are OPEN', () => {
    const dest = { id: 1, nodeId: 2, lat: 40.383, lng: 49.815 };
    const route = computeShortestPath(origin, dest, MOCK_NODES, buildMockRoads(false));
    expect(route.reachable).toBe(true);
    expect(route.roadNamesUsed).toContain('Birbaşa Prospekt');
    expect(route.roadNamesUsed).not.toContain('Yan Dəhliz 2');
  });

  it('reroutes automatically around CLOSED road segments', () => {
    const points = [
      {
        id: 1,
        name: 'Əsas Sığınacaq',
        type: 'SHELTER',
        zoneId: 1,
        nodeId: 2,
        lat: 40.383,
        lng: 49.815,
        capacity: 500,
        currentOccupancy: 200,
        status: 'OPEN',
      },
    ];

    const plan = evaluateEvacuationOptions(
      origin,
      points,
      MOCK_NODES,
      buildMockRoads(true)
    );

    expect(plan.rerouted).toBe(true);
    expect(plan.rerouteReasons).toContain('ROAD_CLOSURE');
    expect(plan.blockedRoads[0].name).toBe('Birbaşa Prospekt');
    expect(plan.recommendedPoint.route.reachable).toBe(true);
    expect(plan.recommendedPoint.route.roadNamesUsed).toContain('Yan Dəhliz 2');
  });

  it('reroutes to alternative assembly point when nearest point reaches >= 90% occupancy', () => {
    const points = [
      {
        id: 1,
        name: 'Dolu Sığınacaq',
        type: 'SHELTER',
        zoneId: 1,
        nodeId: 2,
        lat: 40.383,
        lng: 49.815,
        capacity: 500,
        currentOccupancy: 455, // 91% >= 90%
        status: 'OPEN',
      },
      {
        id: 2,
        name: 'Alternativ Park',
        type: 'PARK',
        zoneId: 1,
        nodeId: 3,
        lat: 40.383,
        lng: 49.825,
        capacity: 1000,
        currentOccupancy: 300, // 30%
        status: 'OPEN',
      },
    ];

    const plan = evaluateEvacuationOptions(
      origin,
      points,
      MOCK_NODES,
      buildMockRoads(false)
    );

    expect(plan.rerouted).toBe(true);
    expect(plan.rerouteReasons).toContain('OCCUPANCY_THRESHOLD_90');
    expect(plan.skippedCrowdedPoint.name).toBe('Dolu Sığınacaq');
    expect(plan.recommendedPoint.id).toBe(2);
    expect(plan.recommendedPoint.name).toBe('Alternativ Park');
  });

  it('assigns only wheelchair-accessible routes and shelters for SPECIAL_CARE citizens', () => {
    const points = [
      {
        id: 1,
        name: 'Pilləkənli Yeraltı Sığınacaq',
        type: 'SHELTER',
        zoneId: 1,
        nodeId: 2,
        lat: 40.383,
        lng: 49.815,
        capacity: 500,
        currentOccupancy: 100,
        status: 'OPEN',
        isWheelchairAccessible: false,
      },
      {
        id: 2,
        name: 'Panduslu Park Sahəsi',
        type: 'PARK',
        zoneId: 1,
        nodeId: 3,
        lat: 40.383,
        lng: 49.825,
        capacity: 900,
        currentOccupancy: 200,
        status: 'OPEN',
        isWheelchairAccessible: true,
      },
    ];

    const plan = evaluateEvacuationOptions(
      origin,
      points,
      MOCK_NODES,
      buildMockRoads(false, true),
      { accessibleOnly: true }
    );

    expect(plan.accessibleOnly).toBe(true);
    expect(plan.rerouted).toBe(true);
    expect(plan.rerouteReasons).toContain('ACCESSIBILITY_REQUIRED');
    expect(plan.skippedInaccessiblePoint.id).toBe(1);
    expect(plan.recommendedPoint.id).toBe(2);
    expect(plan.recommendedPoint.route.roadNamesUsed).not.toContain('Birbaşa Prospekt');
    expect(plan.recommendedPoint.route.roadNamesUsed).toContain('Yan Dəhliz 2');
  });
});

describe('Critical Crisis Algorithm', () => {
  it('does not trigger alert for fewer than 4 SOS signals', () => {
    const signals = [
      { id: 1, zoneId: 1, lat: 40.375, lng: 49.815 },
      { id: 2, zoneId: 1, lat: 40.3755, lng: 49.8154 },
      { id: 3, zoneId: 1, lat: 40.376, lng: 49.8158 },
    ];
    expect(detectSosCluster(signals[2], signals)).toBeNull();
  });

  it('triggers Red Alert when 4th SOS arrives within 500m radius', () => {
    const signals = [
      { id: 1, zoneId: 1, lat: 40.375, lng: 49.815 },
      { id: 2, zoneId: 2, lat: 40.3756, lng: 49.8155 }, // even across zone border if <500m!
      { id: 3, zoneId: 1, lat: 40.376, lng: 49.816 },
      { id: 4, zoneId: 1, lat: 40.3765, lng: 49.8165 },
    ];
    const cluster = detectSosCluster(signals[3], signals);
    expect(cluster).not.toBeNull();
    expect(cluster.triggeredByRadius).toBe(true);
    expect(cluster.sosCount).toBe(4);
  });

  it('triggers Red Alert when assembly point occupancy strictly exceeds 95%', () => {
    expect(detectCapacityOverflow(95, 100)).toBeNull();
    const overflow = detectCapacityOverflow(96, 100);
    expect(overflow).not.toBeNull();
    expect(overflow.occupancyPercent).toBe(96);
  });
});

describe('API input validation', () => {
  const app = createApp();

  it('rejects invalid SOS hazardType with HTTP 400', async () => {
    const res = await request(app).post('/api/citizen/sos').send({
      hazardType: 'INVALID_TYPE',
      zoneId: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('rejects safe confirmation without sosId or citizenCode with HTTP 400', async () => {
    const res = await request(app).patch('/api/citizen/safe').send({});
    expect(res.status).toBe(400);
  });
});

describe('Dispatcher Authentication & Authorization Security', () => {
  const app = createApp();

  it('hashes and verifies passwords with per-user salt via scrypt', () => {
    const h1 = hashPassword('Fhn112!Crisis');
    const h2 = hashPassword('Fhn112!Crisis');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('Fhn112!Crisis', h1)).toBe(true);
    expect(verifyPassword('WrongPass', h1)).toBe(false);
    expect(verifyPassword('Fhn112!Crisis', 'corrupted')).toBe(false);
  });

  it('signs and verifies dispatcher JWT tokens and rejects tampered tokens', () => {
    const token = signDispatcherToken({
      id: 1,
      username: 'dispatcher1',
      badgeCode: 'FHN-112',
      role: 'DISPATCHER',
    });
    const decoded = verifyDispatcherToken(token);
    expect(decoded?.username).toBe('dispatcher1');
    expect(decoded?.badgeCode).toBe('FHN-112');
    expect(verifyDispatcherToken(`${token}tampered`)).toBeNull();
    expect(verifyDispatcherToken(null)).toBeNull();
  });

  it('blocks unauthenticated requests to all dispatcher, traffic-mutation, and simulation endpoints with 401', async () => {
    const protectedRequests = [
      request(app).get('/api/auth/me'),
      request(app).get('/api/dispatcher/dashboard'),
      request(app).post('/api/dispatcher/alerts/1/execute'),
      request(app).post('/api/dispatcher/sos/1/dispatch').send({}),
      request(app).patch('/api/dispatcher/shelters/1/occupancy').send({ occupancyPercent: 95 }),
      request(app).patch('/api/traffic/roads/1/status').send({ status: 'CLOSED' }),
      request(app).post('/api/simulation/sos-burst').send({}),
      request(app).post('/api/simulation/reset'),
    ];

    const responses = await Promise.all(protectedRequests);
    for (const res of responses) {
      expect(res.status).toBe(401);
    }
  });

  it('rejects tampered Bearer tokens with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/dispatcher/dashboard')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });

  it('validates dispatcher login payload with HTTP 400 on short/missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'a',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('No reachable / no step-free assembly point', () => {
  const origin = { lat: 40.3749, lng: 49.8149 };
  const onlyStairsShelter = [
    {
      id: 1,
      name: 'Pilləkənli Sığınacaq',
      type: 'SHELTER',
      zoneId: 1,
      nodeId: 2,
      lat: 40.383,
      lng: 49.815,
      capacity: 500,
      currentOccupancy: 10,
      status: 'OPEN',
      isWheelchairAccessible: false,
    },
  ];

  it('flags NO_ACCESSIBLE_ROUTE for special-care citizens instead of returning nothing', () => {
    const plan = evaluateEvacuationOptions(origin, onlyStairsShelter, MOCK_NODES, buildMockRoads(), {
      accessibleOnly: true,
    });
    expect(plan.recommendedPoint).toBeNull();
    expect(plan.assistanceRequired).toBe('NO_ACCESSIBLE_ROUTE');
    expect(plan.rerouteReasons).toContain('NO_ACCESSIBLE_ROUTE');
  });

  it('flags NO_REACHABLE_POINT when every road to every point is closed', () => {
    const allClosed = buildMockRoads(true).map((r) => ({ ...r, status: 'CLOSED' }));
    const plan = evaluateEvacuationOptions(origin, onlyStairsShelter, MOCK_NODES, allClosed);
    expect(plan.recommendedPoint).toBeNull();
    expect(plan.assistanceRequired).toBe('NO_REACHABLE_POINT');
  });

  it('does not flag assistance when a route exists', () => {
    const plan = evaluateEvacuationOptions(origin, onlyStairsShelter, MOCK_NODES, buildMockRoads());
    expect(plan.assistanceRequired).toBeNull();
  });
});
