import http from 'node:http';
import { resetLatencyMetrics } from '../../src/middleware/latencyMetrics.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { resetDuplicateIndex } from '../../src/services/sosService.js';
import { dispatcherAuthHeader, prisma, resetDatabase } from '../helpers/testContext.js';

/**
 * Challenge Drop #3: 500+ simultaneous SOS requests.
 * Real HTTP server, real PostgreSQL. Distinct client IPs are simulated through
 * X-Forwarded-For (the app trusts one proxy hop, as behind nginx).
 */
const MAX_MEAN_MS = Number(process.env.FLOOD_MAX_MEAN_MS || 300);
let server;
let base;
let zones;
let auth;

beforeAll(async () => {
  const app = createApp();
  app.set('io', null);
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((r) => server.close(r)));

beforeEach(async () => {
  resetLatencyMetrics();
  await resetDatabase();
  zones = await prisma.zone.findMany({ orderBy: { id: 'asc' } });
  auth = await dispatcherAuthHeader();
});

// Keep-alive pool like a reverse proxy (nginx) in front of the app. A raw burst of
// 600 TCP connects would overflow the OS listen backlog (128 on macOS) instead.
const agent = new http.Agent({ keepAlive: true, maxSockets: 100 });

function timedFetch(url, { method = 'GET', headers = {}, body } = {}) {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers, agent }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const serverMs = Number(/dur=([\d.]+)/.exec(res.headers['server-timing'] || '')?.[1] ?? NaN);
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          // not JSON
        }
        resolve({ ms: performance.now() - t0, serverMs, status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const sos = (i, { code, zoneId, hazard = 'COLLAPSE' }) =>
  timedFetch(`${base}/api/citizen/sos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.${(i >> 8) & 255}.${i & 255}` },
    body: JSON.stringify({ citizenCode: code, hazardType: hazard, zoneId }),
  });

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('SOS flood (500+ concurrent requests)', () => {
  it(`accepts 600 distinct SOS with mean latency < ${MAX_MEAN_MS} ms, no errors, one alert per zone`, async () => {
    const results = await Promise.all(
      Array.from({ length: 600 }, (_, i) => sos(i, { code: `BOT-${i}`, zoneId: zones[i % zones.length].id }))
    );
    const serverMean = mean(results.map((r) => r.serverMs));
    const clientMean = mean(results.map((r) => r.ms));
    console.log(
      `[flood] 600 SOS — server mean ${serverMean.toFixed(0)} ms (max ${Math.max(...results.map((r) => r.serverMs)).toFixed(0)}), client end-to-end mean ${clientMean.toFixed(0)} ms`
    );

    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(serverMean).toBeLessThan(MAX_MEAN_MS);

    const active = await prisma.criticalAlert.groupBy({
      by: ['zoneId'],
      where: { alertType: 'SOS_CLUSTER', status: 'ACTIVE' },
      _count: true,
    });
    expect(active).toHaveLength(zones.length);
    expect(active.every((a) => a._count === 1)).toBe(true);
  });

  it('merges a 500-request duplicate storm from one citizen into ONE SOS record', async () => {
    const results = await Promise.all(
      Array.from({ length: 500 }, (_, i) => sos(i, { code: 'CIT-PANIC', zoneId: zones[0].id }))
    );
    console.log(`[flood] duplicate storm — server mean ${mean(results.map((r) => r.serverMs)).toFixed(0)} ms`);
    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200 && r.body.duplicate)).toHaveLength(499);
    expect(new Set(results.map((r) => r.body.sos.id)).size).toBe(1);
    expect(results.filter((r) => r.body.accessToken)).toHaveLength(1); // token only to the creator
    expect(await prisma.sosSignal.count({ where: { citizenCode: 'CIT-PANIC' } })).toBe(1);
  });

  it('with a warm in-memory duplicate index (long-running server) still merges duplicates', async () => {
    resetDuplicateIndex({ warm: true });
    const storm = await Promise.all(
      Array.from({ length: 300 }, (_, i) => sos(i, { code: 'CIT-WARM', zoneId: zones[0].id }))
    );
    expect(storm.filter((r) => r.status === 201)).toHaveLength(1);
    const later = await sos(999, { code: 'CIT-WARM', zoneId: zones[0].id });
    expect(later.status).toBe(200);
    expect(later.body.duplicate).toBe(true);
    const otherHazard = await sos(998, { code: 'CIT-WARM', zoneId: zones[0].id, hazard: 'FIRE' });
    expect(otherHazard.status).toBe(201);
    expect(await prisma.sosSignal.count({ where: { citizenCode: 'CIT-WARM' } })).toBe(2);
    resetDuplicateIndex();
  });

  it('keeps critical dispatcher operations fast during the flood', async () => {
    const flood = Promise.all(
      Array.from({ length: 500 }, (_, i) => sos(i, { code: `FLOOD-${i}`, zoneId: zones[i % zones.length].id }))
    );
    const pending = await prisma.sosSignal.findFirstOrThrow({ where: { citizenCode: 'CIT-DEMO-101' } });
    const [dashboard, dispatch] = await Promise.all([
      timedFetch(`${base}/api/dispatcher/dashboard`, { headers: { authorization: auth } }),
      timedFetch(`${base}/api/dispatcher/sos/${pending.id}/dispatch`, {
        method: 'POST',
        headers: { authorization: auth, 'content-type': 'application/json' },
        body: '{}',
      }),
    ]);
    await flood;
    console.log(
      `[flood] during flood: dashboard ${dashboard.serverMs.toFixed(0)} ms, dispatch ${dispatch.serverMs.toFixed(0)} ms (server)`
    );
    expect(dashboard.status).toBe(200);
    expect(dispatch.status).toBe(200);
    expect(dispatch.serverMs).toBeLessThan(MAX_MEAN_MS);
  });
});

describe('Latency monitoring endpoint', () => {
  it('reports rolling mean / p95 per route to authorised dispatchers', async () => {
    await Promise.all(Array.from({ length: 50 }, (_, i) => sos(i, { code: `M-${i}`, zoneId: zones[0].id })));
    const res = await timedFetch(`${base}/api/metrics/latency`, { headers: { authorization: auth } });
    expect(res.status).toBe(200);
    const sosRoute = res.body.routes['POST /api/citizen/sos'];
    expect(sosRoute.total).toBe(50);
    expect(sosRoute.meanMs).toBeLessThan(MAX_MEAN_MS);
    expect(res.body.targetMeanMs).toBe(300);

    const anonymous = await timedFetch(`${base}/api/metrics/latency`);
    expect(anonymous.status).toBe(401);
  });
});
