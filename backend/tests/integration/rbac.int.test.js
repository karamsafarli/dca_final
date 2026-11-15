import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { signDispatcherToken } from '../../src/services/authService.js';
import { createRecordingIo, dispatcherAuthHeader, prisma, resetDatabase } from '../helpers/testContext.js';

/** Challenge Drop #3: critical dispatcher operations are protected by JWT + RBAC. */
const app = createApp();
app.set('io', createRecordingIo());
let sos;
let alertId;

beforeEach(async () => {
  await resetDatabase();
  sos = await prisma.sosSignal.findFirstOrThrow({ where: { citizenCode: 'CIT-DEMO-101' } });
  const zone = await prisma.zone.findFirstOrThrow();
  alertId = (
    await prisma.criticalAlert.create({
      data: { alertType: 'SOS_CLUSTER', zoneId: zone.id, centerLat: 40.4, centerLng: 49.8, sosCount: 4, title: 't', message: 'm' },
    })
  ).id;
});

const critical = () => [
  ['dispatch brigade', (r) => r.post(`/api/dispatcher/sos/${sos.id}/dispatch`).send({})],
  ['execute Red Alert', (r) => r.post(`/api/dispatcher/alerts/${alertId}/execute`)],
  ['dismiss Red Alert', (r) => r.patch(`/api/dispatcher/alerts/${alertId}/dismiss`)],
  ['close a road', (r) => r.patch('/api/traffic/roads/1/status').send({ status: 'CLOSED' })],
  ['change occupancy', (r) => r.patch('/api/dispatcher/shelters/1/occupancy').send({ occupancyPercent: 50 })],
  ['run a simulation', (r) => r.post('/api/simulation/sos-burst').send({})],
];

const as = (auth) => {
  const agent = request(app);
  const wrap = (method) => (url) => agent[method](url).set('Authorization', auth);
  return { post: wrap('post'), patch: wrap('patch'), get: wrap('get') };
};

describe('Role-based access control', () => {
  it('OBSERVER can read the live dashboard', async () => {
    const res = await as(await dispatcherAuthHeader('observer')).get('/api/dispatcher/dashboard');
    expect(res.status).toBe(200);
  });

  it.each(critical().map(([name]) => [name]))('OBSERVER is refused: %s → 403 FORBIDDEN', async (name) => {
    const [, call] = critical().find(([n]) => n === name);
    const res = await call(as(await dispatcherAuthHeader('observer')));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('OBSERVER action did not change anything (brigade not dispatched)', async () => {
    await as(await dispatcherAuthHeader('observer')).post(`/api/dispatcher/sos/${sos.id}/dispatch`);
    expect((await prisma.sosSignal.findUnique({ where: { id: sos.id } })).status).toBe('PENDING');
  });

  it('DISPATCHER can dispatch a brigade', async () => {
    const res = await as(await dispatcherAuthHeader('dispatcher1')).post(`/api/dispatcher/sos/${sos.id}/dispatch`);
    expect(res.status).toBe(200);
  });

  it('only COMMANDER may reset the system', async () => {
    expect((await as(await dispatcherAuthHeader('dispatcher1')).post('/api/simulation/reset')).status).toBe(403);
    expect((await as(await dispatcherAuthHeader('commander')).post('/api/simulation/reset')).status).toBe(200);
  });

  it('uses the role from the database, not from the token (demotion is immediate)', async () => {
    const dispatcher = await prisma.dispatcher.findUniqueOrThrow({ where: { username: 'dispatcher1' } });
    const token = `Bearer ${signDispatcherToken(dispatcher)}`; // token says DISPATCHER
    await prisma.dispatcher.update({ where: { id: dispatcher.id }, data: { role: 'OBSERVER' } });
    const res = await as(token).post(`/api/dispatcher/sos/${sos.id}/dispatch`);
    expect(res.status).toBe(403);
    await prisma.dispatcher.update({ where: { id: dispatcher.id }, data: { role: 'DISPATCHER' } });
  });

  it('a deactivated account is rejected even with a valid token', async () => {
    const dispatcher = await prisma.dispatcher.findUniqueOrThrow({ where: { username: 'dispatcher1' } });
    const token = `Bearer ${signDispatcherToken(dispatcher)}`;
    await prisma.dispatcher.update({ where: { id: dispatcher.id }, data: { isActive: false } });
    expect((await as(token).get('/api/dispatcher/dashboard')).status).toBe(401);
    await prisma.dispatcher.update({ where: { id: dispatcher.id }, data: { isActive: true } });
  });

  it('login and /auth/me expose the permission list for the UI', async () => {
    const res = await as(await dispatcherAuthHeader('observer')).get('/api/auth/me');
    expect(res.body.dispatcher.permissions).toEqual(['dashboard:read']);
  });
});
