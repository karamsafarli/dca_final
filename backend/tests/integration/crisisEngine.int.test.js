import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { executeCriticalAlert } from '../../src/services/crisisEngineService.js';
import {
  createRecordingIo,
  dispatcherAuthHeader,
  prisma,
  resetDatabase,
} from '../helpers/testContext.js';

const app = createApp();
app.set('io', createRecordingIo());

let yasamal;

// ~80-240 m offsets around the Yasamal centre: always inside the 500 m radius.
const OFFSETS = [
  [0.0007, 0.0005],
  [-0.0009, 0.0008],
  [0.0011, -0.0007],
  [-0.0006, -0.001],
  [0.0004, 0.0004],
];

function sendSos(citizenCode, i = 0, extra = {}) {
  const [dLat, dLng] = OFFSETS[i % OFFSETS.length];
  return request(app)
    .post('/api/citizen/sos')
    .send({
      citizenCode,
      hazardType: 'COLLAPSE',
      zoneId: yasamal.id,
      lat: yasamal.centerLat + dLat,
      lng: yasamal.centerLng + dLng,
      ...extra,
    });
}

const activeClusterAlerts = () =>
  prisma.criticalAlert.findMany({
    where: { alertType: 'SOS_CLUSTER', zoneId: yasamal.id, status: 'ACTIVE' },
  });

beforeEach(async () => {
  await resetDatabase();
  yasamal = await prisma.zone.findUniqueOrThrow({ where: { code: 'YASAMAL' } });
});

describe('Critical Crisis Algorithm — 4 distinct SOS in 5 min / 500 m', () => {
  it('does NOT raise a Red Alert when one citizen sends SOS four times', async () => {
    for (let i = 0; i < 4; i += 1) {
      const res = await sendSos('CIT-SAME-PERSON', i);
      expect(res.status).toBe(201);
      expect(res.body.triggeredAlert).toBeNull();
    }
    expect(await activeClusterAlerts()).toHaveLength(0);
  });

  it('raises exactly one Red Alert when the 4th distinct citizen sends SOS', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await sendSos(`CIT-DISTINCT-${i}`, i);
      expect(res.body.triggeredAlert).toBeNull();
    }
    const fourth = await sendSos('CIT-DISTINCT-3', 3);
    expect(fourth.body.triggeredAlert).toMatchObject({
      alertType: 'SOS_CLUSTER',
      status: 'ACTIVE',
      sosCount: 4,
    });
    expect(await activeClusterAlerts()).toHaveLength(1);
  });

  it('creates a single alert even when 4 distinct SOS arrive concurrently', async () => {
    await Promise.all([0, 1, 2, 3].map((i) => sendSos(`CIT-PAR-${i}`, i)));
    // A late 5th signal must update, not duplicate.
    await sendSos('CIT-PAR-4', 4);
    expect(await activeClusterAlerts()).toHaveLength(1);
  });

  it('does not immediately re-raise an alert for signals already handled by an executed alert', async () => {
    for (let i = 0; i < 4; i += 1) await sendSos(`CIT-H-${i}`, i);
    const [alert] = await activeClusterAlerts();
    const auth = await dispatcherAuthHeader();

    const exec = await request(app)
      .post(`/api/dispatcher/alerts/${alert.id}/execute`)
      .set('Authorization', auth);
    expect(exec.status).toBe(200);

    const fifth = await sendSos('CIT-H-NEW', 4);
    expect(fifth.body.triggeredAlert).toBeNull();
    expect(await activeClusterAlerts()).toHaveLength(0);

    // ...but 4 NEW distinct signals after the decision do raise a fresh alert.
    for (let i = 0; i < 3; i += 1) await sendSos(`CIT-H2-${i}`, i);
    expect(await activeClusterAlerts()).toHaveLength(1);
  });

  it('does not immediately re-raise an alert after the operator dismisses it', async () => {
    for (let i = 0; i < 4; i += 1) await sendSos(`CIT-D-${i}`, i);
    const [alert] = await activeClusterAlerts();
    const auth = await dispatcherAuthHeader();

    const res = await request(app)
      .patch(`/api/dispatcher/alerts/${alert.id}/dismiss`)
      .set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.alert.status).toBe('DISMISSED');

    await sendSos('CIT-D-NEW', 4);
    expect(await activeClusterAlerts()).toHaveLength(0);
  });
});

describe('One-click Red Alert execution — concurrency safety', () => {
  async function createClusterAlert() {
    for (let i = 0; i < 4; i += 1) await sendSos(`CIT-X-${i}`, i);
    const [alert] = await activeClusterAlerts();
    return alert;
  }

  it('dispatches exactly one brigade when two dispatchers click execute at the same time', async () => {
    const alert = await createClusterAlert();
    const before = await prisma.rescueBrigade.count({ where: { status: 'DISPATCHED' } });
    const openBefore = await prisma.assemblyPoint.count({ where: { status: 'OPEN' } });

    const results = await Promise.all([
      executeCriticalAlert(alert.id, null),
      executeCriticalAlert(alert.id, null),
    ]);

    expect(results.filter((r) => r.alreadyExecuted)).toHaveLength(1);
    expect(await prisma.rescueBrigade.count({ where: { status: 'DISPATCHED' } })).toBe(before + 1);
    expect(await prisma.assemblyPoint.count({ where: { status: 'OPEN' } })).toBe(openBefore + 1);
  });

  it('never assigns the same brigade to two different alerts executed concurrently', async () => {
    const sabail = await prisma.zone.findUniqueOrThrow({ where: { code: 'SABAIL' } });
    const [a1, a2] = await Promise.all(
      [yasamal, sabail].map((zone) =>
        prisma.criticalAlert.create({
          data: {
            alertType: 'SOS_CLUSTER',
            zoneId: zone.id,
            centerLat: zone.centerLat,
            centerLng: zone.centerLng,
            sosCount: 4,
            title: 'test',
            message: 'test',
          },
        })
      )
    );
    // Leave exactly one free brigade in the whole city.
    const free = await prisma.rescueBrigade.findFirstOrThrow({ where: { code: 'BRG-NAS-01' } });
    await prisma.rescueBrigade.updateMany({
      where: { id: { not: free.id } },
      data: { status: 'DISPATCHED' },
    });

    const [r1, r2] = await Promise.all([
      executeCriticalAlert(a1.id, null),
      executeCriticalAlert(a2.id, null),
    ]);

    expect(r1.dispatchedBrigade.id).not.toBe(r2.dispatchedBrigade.id);
    const claimedFree = [r1, r2].filter((r) => r.dispatchedBrigade.id === free.id);
    expect(claimedFree).toHaveLength(1);
  });

  it('refuses to execute a dismissed alert with HTTP 409', async () => {
    const alert = await createClusterAlert();
    const auth = await dispatcherAuthHeader();
    await request(app).patch(`/api/dispatcher/alerts/${alert.id}/dismiss`).set('Authorization', auth);

    const res = await request(app)
      .post(`/api/dispatcher/alerts/${alert.id}/execute`)
      .set('Authorization', auth);
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown alerts and 400 for non-numeric ids', async () => {
    const auth = await dispatcherAuthHeader();
    const missing = await request(app)
      .patch('/api/dispatcher/alerts/999999/dismiss')
      .set('Authorization', auth);
    expect(missing.status).toBe(404);

    const bad = await request(app)
      .post('/api/dispatcher/alerts/abc/execute')
      .set('Authorization', auth);
    expect(bad.status).toBe(400);
  });
});

describe('Manual brigade dispatch', () => {
  it('rejects dispatching a brigade that is already on a mission with HTTP 409', async () => {
    const auth = await dispatcherAuthHeader();
    const sos = await prisma.sosSignal.findFirstOrThrow({ where: { citizenCode: 'CIT-DEMO-101' } });
    const busy = await prisma.rescueBrigade.update({
      where: { code: 'BRG-SAB-01' },
      data: { status: 'DISPATCHED' },
    });

    const res = await request(app)
      .post(`/api/dispatcher/sos/${sos.id}/dispatch`)
      .set('Authorization', auth)
      .send({ brigadeId: busy.id });
    expect(res.status).toBe(409);
  });
});
