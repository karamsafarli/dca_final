import http from 'node:http';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { attachRealtime } from '../../src/realtime/socketServer.js';
import { dispatcherAuthHeader, prisma, resetDatabase } from '../helpers/testContext.js';

let server;
let baseUrl;
let app;
const sockets = [];

function openSocket(auth = {}) {
  return new Promise((resolve, reject) => {
    const s = connect(baseUrl, { auth, transports: ['websocket'], forceNew: true });
    sockets.push(s);
    s.once('connected', () => resolve(s));
    s.once('connect_error', reject);
  });
}

function collect(socket, event) {
  const received = [];
  socket.on(event, (payload) => received.push(payload));
  return received;
}

const settle = () => new Promise((r) => setTimeout(r, 300));

beforeAll(async () => {
  app = createApp();
  server = http.createServer(app);
  const io = attachRealtime(server);
  app.set('io', io);
  await new Promise((r) => server.listen(0, r));
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await new Promise((r) => server.close(r));
});

beforeEach(resetDatabase);

describe('Socket.IO channel isolation — citizen PII is never broadcast', () => {
  it('only dispatchers receive full SOS records; anonymous sockets receive none', async () => {
    const token = (await dispatcherAuthHeader()).replace('Bearer ', '');
    const dispatcherSocket = await openSocket({ token });
    const anonymousSocket = await openSocket();

    const dispatcherUpdates = collect(dispatcherSocket, 'sos:updated');
    const dispatcherCreated = collect(dispatcherSocket, 'sos:created');
    const anonUpdates = collect(anonymousSocket, 'sos:updated');
    const anonCreated = collect(anonymousSocket, 'sos:created');
    const anonExecuted = collect(anonymousSocket, 'alert:executed');

    const zone = await prisma.zone.findUniqueOrThrow({ where: { code: 'SABAIL' } });
    const { body } = await request(app).post('/api/citizen/sos').send({
      citizenCode: 'CIT-PII',
      citizenName: 'Secret Name',
      phone: '+994509999999',
      hazardType: 'MEDICAL',
      zoneId: zone.id,
    });
    await request(app)
      .post(`/api/dispatcher/sos/${body.sos.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    await settle();

    expect(dispatcherCreated).toHaveLength(1);
    expect(dispatcherUpdates[0]).toMatchObject({ id: body.sos.id, phone: '+994509999999' });
    expect(anonCreated).toHaveLength(0);
    expect(anonUpdates).toHaveLength(0);
    expect(anonExecuted).toHaveLength(0);
  });

  it('lets a citizen follow only their own SOS, with a PII-free status payload', async () => {
    const zone = await prisma.zone.findUniqueOrThrow({ where: { code: 'SABAIL' } });
    const { body } = await request(app).post('/api/citizen/sos').send({
      citizenCode: 'CIT-WATCH',
      citizenName: 'Owner Name',
      phone: '+994501234567',
      hazardType: 'FIRE',
      zoneId: zone.id,
    });

    const citizen = await openSocket();
    const ack = await citizen.emitWithAck('citizen:watch', {
      sosId: body.sos.id,
      accessToken: body.accessToken,
    });
    expect(ack).toEqual({ ok: true });

    const intruder = await openSocket();
    const denied = await intruder.emitWithAck('citizen:watch', {
      sosId: body.sos.id,
      accessToken: 'y'.repeat(32),
    });
    expect(denied.ok).toBe(false);

    const ownerStatus = collect(citizen, 'sos:status');
    const intruderStatus = collect(intruder, 'sos:status');

    await request(app)
      .post(`/api/dispatcher/sos/${body.sos.id}/dispatch`)
      .set('Authorization', await dispatcherAuthHeader())
      .send({});
    await settle();

    expect(intruderStatus).toHaveLength(0);
    expect(ownerStatus).toHaveLength(1);
    expect(ownerStatus[0]).toMatchObject({ id: body.sos.id, status: 'DISPATCHED' });
    expect(JSON.stringify(ownerStatus[0])).not.toMatch(/Owner Name|\+994501234567/);
  });
});
