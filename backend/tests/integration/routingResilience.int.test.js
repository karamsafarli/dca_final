import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createMockRoutingApi } from '../../src/external/mockRoutingApi.js';
import { emitRoutingStatus } from '../../src/realtime/events.js';
import { createRoutingGateway, setRoutingGateway } from '../../src/services/routingGateway.js';
import {
  createRecordingIo,
  dispatcherAuthHeader,
  prisma,
  resetDatabase,
} from '../helpers/testContext.js';

const CONTROL_TOKEN = 'test-control-token';

let provider;
let providerServer;
let gateway;
let io;
let app;
let auth;

async function startProvider() {
  provider = createMockRoutingApi({
    controlToken: CONTROL_TOKEN,
    slowDelayMs: 1500,
    loadGraph: async () => ({
      nodes: await prisma.roadNode.findMany(),
      roads: await prisma.roadSegment.findMany({ orderBy: { id: 'asc' } }),
    }),
  });
  providerServer = http.createServer(provider.app);
  await new Promise((r) => providerServer.listen(0, r));
  return `http://localhost:${providerServer.address().port}`;
}

const getPlan = (zoneCode) =>
  prisma.zone
    .findUniqueOrThrow({ where: { code: zoneCode } })
    .then((zone) => request(app).get('/api/citizen/evacuation-plan').query({ zoneId: zone.id }));

const setProviderMode = (mode) =>
  request(app).post('/api/simulation/routing-api').set('Authorization', auth).send({ mode });

beforeAll(async () => {
  const url = await startProvider();
  gateway = createRoutingGateway({
    API_URL: url,
    CONTROL_TOKEN,
    TIMEOUT_MS: 400, // the production value is 5000 ms; shortened to keep tests fast
    FAILURE_THRESHOLD: 3,
    OPEN_DURATION_MS: 60000,
  });
  setRoutingGateway(gateway);
  io = createRecordingIo();
  gateway.on('status', (status) => emitRoutingStatus(io, status));
  app = createApp();
  app.set('io', io);
});

afterAll(async () => {
  setRoutingGateway(null);
  if (providerServer.listening) await new Promise((r) => providerServer.close(r));
});

beforeEach(async () => {
  await resetDatabase();
  auth = await dispatcherAuthHeader();
  provider.state.mode = 'HEALTHY';
  gateway.reset();
  io.events.length = 0;
});

describe('External Map & Routing API failure (Challenge Drop #2)', () => {
  it('uses the external API while it is healthy', async () => {
    const res = await getPlan('YASAMAL');
    expect(res.status).toBe(200);
    expect(res.body.routing).toMatchObject({ mode: 'ONLINE', degraded: false });
    expect(res.body.recommendedPoint.route.reachable).toBe(true);
  });

  it('keeps serving routes from the local road graph when the API returns HTTP 503', async () => {
    expect((await setProviderMode('DOWN')).status).toBe(200);

    const res = await getPlan('SABAIL');
    expect(res.status).toBe(200);
    expect(res.body.routing).toMatchObject({
      mode: 'FALLBACK_LOCAL_GRAPH',
      degraded: true,
      reason: 'EXTERNAL_UNAVAILABLE',
    });
    expect(res.body.recommendedPoint.route.reachable).toBe(true);
    expect(res.body.recommendedPoint.route.polyline.length).toBeGreaterThan(1);
  });

  it('serves the last cached routes for a previously requested location', async () => {
    const online = await getPlan('NASIMI');
    await setProviderMode('DOWN');

    const offline = await getPlan('NASIMI');
    expect(offline.body.routing.mode).toBe('FALLBACK_CACHE');
    expect(offline.body.recommendedPoint.id).toBe(online.body.recommendedPoint.id);
    expect(offline.body.recommendedPoint.route.polyline).toEqual(
      online.body.recommendedPoint.route.polyline
    );
  });

  it('times out slow responses (> limit) and still answers well before the provider would', async () => {
    await setProviderMode('SLOW');
    const started = Date.now();
    const res = await getPlan('KHATAI');
    expect(Date.now() - started).toBeLessThan(1500);
    expect(res.status).toBe(200);
    expect(res.body.routing).toMatchObject({ degraded: true, reason: 'EXTERNAL_TIMEOUT' });
  });

  it('opens the circuit after repeated failures and answers instantly without calling the API', async () => {
    await setProviderMode('DOWN');
    for (let i = 0; i < 3; i += 1) await getPlan('YASAMAL');
    const before = provider.state.requests;

    const res = await getPlan('NARIMANOV');
    expect(res.body.routing.reason).toBe('CIRCUIT_OPEN');
    expect(provider.state.requests).toBe(before);

    const status = await request(app).get('/api/routing/status');
    expect(status.body.circuit.state).toBe('OPEN');
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('degraded');
  });

  it('notifies clients over Socket.IO and returns ONLINE after the API recovers', async () => {
    await setProviderMode('DOWN');
    await getPlan('YASAMAL');
    expect(io.events.some((e) => e.event === 'routing:status' && e.payload.degraded)).toBe(true);

    await setProviderMode('HEALTHY');
    const res = await getPlan('YASAMAL');
    expect(res.body.routing.mode).toBe('ONLINE');
    expect(io.events.at(-1).payload).toMatchObject({ reason: 'ROUTING_MODE_CHANGED', mode: 'ONLINE' });
  });

  it('only dispatchers can change the simulated provider mode', async () => {
    const res = await request(app).post('/api/simulation/routing-api').send({ mode: 'DOWN' });
    expect(res.status).toBe(401);
    const bad = await request(app)
      .post('/api/simulation/routing-api')
      .set('Authorization', auth)
      .send({ mode: 'BROKEN' });
    expect(bad.status).toBe(400);
  });

  it('survives the provider process disappearing entirely (connection refused)', async () => {
    await new Promise((r) => providerServer.close(r));
    const res = await getPlan('SABAIL');
    expect(res.status).toBe(200);
    expect(res.body.routing).toMatchObject({ degraded: true, reason: 'EXTERNAL_UNREACHABLE' });
    expect(res.body.recommendedPoint).not.toBeNull();
  });
});
