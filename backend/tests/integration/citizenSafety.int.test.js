import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  createRecordingIo,
  dispatcherAuthHeader,
  prisma,
  resetDatabase,
} from '../helpers/testContext.js';

const app = createApp();
app.set('io', createRecordingIo());

let zone;

beforeEach(async () => {
  await resetDatabase();
  zone = await prisma.zone.findUniqueOrThrow({ where: { code: 'YASAMAL' } });
});

const sendSos = (citizenCode = 'CIT-OWNER') =>
  request(app).post('/api/citizen/sos').send({
    citizenCode,
    citizenName: 'Test Citizen',
    phone: '+994500000000',
    hazardType: 'FIRE',
    zoneId: zone.id,
  });

describe('SOS ownership — "I am safe" cannot be forged (IDOR)', () => {
  it('returns a one-time access token on SOS creation and never exposes its hash', async () => {
    const res = await sendSos();
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(JSON.stringify(res.body)).not.toContain('accessTokenHash');

    const dash = await request(app)
      .get('/api/dispatcher/dashboard')
      .set('Authorization', await dispatcherAuthHeader());
    expect(JSON.stringify(dash.body)).not.toContain('accessTokenHash');
  });

  it('requires the access token to close an SOS by id', async () => {
    const { body } = await sendSos();
    const res = await request(app).patch('/api/citizen/safe').send({ sosId: body.sos.id });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong access token with HTTP 403 and leaves the SOS open', async () => {
    const { body } = await sendSos();
    const res = await request(app)
      .patch('/api/citizen/safe')
      .send({ sosId: body.sos.id, accessToken: 'x'.repeat(32) });
    expect(res.status).toBe(403);

    const sos = await prisma.sosSignal.findUnique({ where: { id: body.sos.id } });
    expect(sos.citizenStatus).toBe('SOS');
  });

  it('closes the SOS with the correct access token', async () => {
    const { body } = await sendSos();
    const res = await request(app)
      .patch('/api/citizen/safe')
      .send({ sosId: body.sos.id, accessToken: body.accessToken });
    expect(res.status).toBe(200);
    expect(res.body.sos).toMatchObject({ citizenStatus: 'SAFE', status: 'RESOLVED' });
  });

  it('a citizenCode-only safe check-in never closes somebody else\'s SOS', async () => {
    const { body } = await sendSos('CIT-VICTIM');
    const res = await request(app).patch('/api/citizen/safe').send({ citizenCode: 'CIT-VICTIM' });
    expect(res.status).toBe(200);

    const victim = await prisma.sosSignal.findUnique({ where: { id: body.sos.id } });
    expect(victim.citizenStatus).toBe('SOS');
    expect(victim.status).toBe('PENDING');
  });
});

describe('Priority #1 for citizens who cannot reach any assembly point', () => {
  it('raises a standard citizen SOS to Priority #1 when transport is needed', async () => {
    const res = await request(app).post('/api/citizen/sos').send({
      citizenCode: 'CIT-TRAPPED',
      hazardType: 'MEDICAL',
      needsTransport: true,
      zoneId: zone.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.sos).toMatchObject({ priorityLevel: 1, citizenCategory: 'STANDARD' });
  });
});

describe('"I am safe" without a prior SOS is a check-in, not a fake SOS', () => {
  it('stores a SafetyCheckIn, creates no SOS record and is counted as a safe confirmation', async () => {
    const auth = await dispatcherAuthHeader();
    const before = await request(app).get('/api/dispatcher/dashboard').set('Authorization', auth);
    const sosBefore = await prisma.sosSignal.count();

    const res = await request(app)
      .patch('/api/citizen/safe')
      .send({ citizenCode: 'CIT-CHECKIN', zoneId: zone.id, lat: 40.39, lng: 49.82 });
    expect(res.status).toBe(200);
    expect(res.body.checkIn).toMatchObject({ citizenCode: 'CIT-CHECKIN', zoneId: zone.id, lat: 40.39 });

    expect(await prisma.sosSignal.count()).toBe(sosBefore);
    expect(await prisma.safetyCheckIn.count()).toBe(1);

    const after = await request(app).get('/api/dispatcher/dashboard').set('Authorization', auth);
    expect(after.body.summary.safeConfirmationsCount).toBe(before.body.summary.safeConfirmationsCount + 1);
    expect(after.body.summary.activeSosCount).toBe(before.body.summary.activeSosCount);
  });
});
