import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createRecordingIo, dispatcherAuthHeader, prisma, resetDatabase } from '../helpers/testContext.js';

/** The dispatcher demo scenarios used in the jury presentation. */
const app = createApp();
app.set('io', createRecordingIo());
let auth;
let zone;

beforeEach(async () => {
  await resetDatabase();
  auth = await dispatcherAuthHeader();
  zone = await prisma.zone.findUniqueOrThrow({ where: { code: 'YASAMAL' } });
});

const sim = (path, body = {}) =>
  request(app).post(`/api/simulation/${path}`).set('Authorization', auth).send(body);

describe('Demo scenarios', () => {
  it('sos-burst: 4 distinct citizens within 500 m raise a Red Alert', async () => {
    const res = await sim('sos-burst', { zoneId: zone.id });
    expect(res.status).toBe(201);
    expect(res.body.createdCount).toBe(4);
    expect(res.body.triggeredAlert).toMatchObject({ alertType: 'SOS_CLUSTER', status: 'ACTIVE' });
  });

  it('road-toggle: closes a road on the current route and the plan reroutes around it', async () => {
    const before = await request(app).get('/api/citizen/evacuation-plan').query({ zoneId: zone.id });
    const res = await sim('road-toggle', { zoneId: zone.id, status: 'CLOSED' });
    expect(res.status).toBe(200);
    expect(res.body.road.status).toBe('CLOSED');

    const after = await request(app).get('/api/citizen/evacuation-plan').query({ zoneId: zone.id });
    expect(after.body.rerouteReasons).toContain('ROAD_CLOSURE');
    expect(after.body.recommendedPoint.route.roadIdsUsed).not.toContain(res.body.road.id);
    expect(before.body.recommendedPoint.route.roadIdsUsed).toContain(res.body.road.id);
  });

  it('occupancy-spike 97 %: marks the point critical and raises a capacity Red Alert', async () => {
    const res = await sim('occupancy-spike', { targetPercent: 97 });
    expect(res.status).toBe(200);
    expect(res.body.assemblyPoint.occupancyPercent).toBeGreaterThan(95);
    expect(res.body.triggeredAlert).toMatchObject({ alertType: 'CAPACITY_OVERFLOW' });
  });

  it('occupancy-spike 92 %: citizens are rerouted but no Red Alert is raised', async () => {
    const res = await sim('occupancy-spike', { targetPercent: 92 });
    expect(res.body.triggeredAlert).toBeNull();
  });

  it('reset: restores the clean seed state', async () => {
    await sim('sos-burst', { zoneId: zone.id });
    const res = await sim('reset');
    expect(res.status).toBe(200);
    expect(await prisma.criticalAlert.count()).toBe(0);
    expect(await prisma.sosSignal.count()).toBe(2); // the two seeded demo SOS
  });

  it('returns 404 for an unknown road', async () => {
    const res = await sim('road-toggle', { roadId: 999999 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROAD_NOT_FOUND');
  });
});
