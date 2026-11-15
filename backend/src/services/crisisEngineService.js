import { CRISIS_THRESHOLDS } from '../config/constants.js';
import { lockKey, prisma } from '../config/db.js';
import { emitAlertCreated, emitAlertResolved } from '../realtime/events.js';
import { createCoalescer } from '../resilience/coalesce.js';
import { conflict, notFound } from '../utils/errors.js';
import { claimBrigade } from './brigadeAllocation.js';
import {
  calculateOccupancyPercent,
  haversineDistanceMeters,
} from './geometryService.js';

export const RED_ALERT_TITLE =
  'Qırmızı Həyəcan: Əlavə xilasetmə briqadası göndər və yeni toplanış nöqtəsi aç';

/**
 * Keep only the most recent signal per citizen, so the rule counts *distinct*
 * people ("ən azı 4 fərqli SOS siqnalı") and one person tapping SOS repeatedly
 * cannot raise a Red Alert alone. Signals without a citizen code count individually.
 */
export function dedupeSignalsByCitizen(signals) {
  const latest = new Map();
  for (const s of signals) {
    const key = s.citizenCode ? `c:${s.citizenCode}` : `id:${s.id}`;
    const prev = latest.get(key);
    if (!prev || new Date(s.createdAt ?? 0) >= new Date(prev.createdAt ?? 0)) {
      latest.set(key, s);
    }
  }
  return [...latest.values()];
}

/**
 * Start of the counting window: the last 5 minutes, but never earlier than the
 * moment an operator last executed/dismissed a cluster alert for the zone.
 * Signals already handled by that decision must not immediately re-raise an alert.
 */
export function clusterWindowStart(now, lastResolvedAt) {
  const timeWindow = new Date(
    now.getTime() - CRISIS_THRESHOLDS.SOS_CLUSTER_WINDOW_MINUTES * 60 * 1000
  );
  if (lastResolvedAt && new Date(lastResolvedAt) > timeWindow) {
    return new Date(lastResolvedAt);
  }
  return timeWindow;
}

/**
 * Pure detector for SOS clustering: >= 4 distinct citizens' SOS in 5 min within
 * the same zone OR a 500 m radius of the newest signal.
 */
export function detectSosCluster(triggerSos, recentSignals) {
  const activeRecentSignals = dedupeSignalsByCitizen(recentSignals);
  const sameZone = activeRecentSignals.filter(
    (s) => s.zoneId === triggerSos.zoneId
  );
  const withinRadius = activeRecentSignals.filter(
    (s) =>
      haversineDistanceMeters(triggerSos.lat, triggerSos.lng, s.lat, s.lng) <=
      CRISIS_THRESHOLDS.SOS_CLUSTER_RADIUS_METERS
  );

  const triggeredByRadius =
    withinRadius.length >= CRISIS_THRESHOLDS.SOS_CLUSTER_MIN_COUNT;
  const triggeredByZone =
    sameZone.length >= CRISIS_THRESHOLDS.SOS_CLUSTER_MIN_COUNT;

  if (!triggeredByRadius && !triggeredByZone) {
    return null;
  }

  const clusterSignals = triggeredByRadius ? withinRadius : sameZone;
  const avgLat =
    clusterSignals.reduce((acc, s) => acc + s.lat, 0) / clusterSignals.length;
  const avgLng =
    clusterSignals.reduce((acc, s) => acc + s.lng, 0) / clusterSignals.length;

  return {
    triggeredByRadius,
    triggeredByZone,
    sosCount: clusterSignals.length,
    centerLat: Number(avgLat.toFixed(6)),
    centerLng: Number(avgLng.toFixed(6)),
  };
}

/**
 * Pure detector for > 95% shelter occupancy overflow.
 */
export function detectCapacityOverflow(currentOccupancy, capacity) {
  const occupancyPercent = calculateOccupancyPercent(currentOccupancy, capacity);
  if (occupancyPercent <= CRISIS_THRESHOLDS.CRITICAL_OCCUPANCY_PERCENT) {
    return null;
  }
  return { occupancyPercent };
}

/**
 * A new >95% alert for a point is warranted if none was handled before, or if
 * occupancy is now higher than when the operator last handled one.
 */
export function shouldRaiseCapacityAlert(currentPercent, lastHandledPercent) {
  if (lastHandledPercent === null || lastHandledPercent === undefined) return true;
  return currentPercent > lastHandledPercent;
}

/**
 * Evaluate SOS cluster conditions after a new SOS signal arrives.
 * Runs under a per-zone advisory lock so concurrent SOS requests can never
 * create duplicate ACTIVE alerts for the same zone.
 */
export async function evaluateSosCrisis(triggerSos, io) {
  const outcome = await prisma.$transaction(async (tx) => {
    await lockKey(tx, `sos-cluster:${triggerSos.zoneId}`);

    const lastResolved = await tx.criticalAlert.findFirst({
      where: {
        alertType: 'SOS_CLUSTER',
        zoneId: triggerSos.zoneId,
        resolvedAt: { not: null },
      },
      orderBy: { resolvedAt: 'desc' },
      select: { resolvedAt: true },
    });

    const recentActiveSignals = await tx.sosSignal.findMany({
      where: {
        citizenStatus: 'SOS',
        status: { not: 'RESOLVED' },
        createdAt: { gt: clusterWindowStart(new Date(), lastResolved?.resolvedAt) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cluster = detectSosCluster(triggerSos, recentActiveSignals);
    if (!cluster) return null;

    const zone = await tx.zone.findUnique({ where: { id: triggerSos.zoneId } });
    const existingActive = await tx.criticalAlert.findFirst({
      where: { alertType: 'SOS_CLUSTER', zoneId: triggerSos.zoneId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const reasonDetail = cluster.triggeredByRadius
      ? `500 metr radiusda son 5 dəqiqədə ${cluster.sosCount} fərqli vətəndaşdan aktiv SOS siqnalı qeydə alındı`
      : `${zone?.name || 'Zona'} üzrə son 5 dəqiqədə ${cluster.sosCount} fərqli vətəndaşdan aktiv SOS siqnalı qeydə alındı`;
    const message = `${reasonDetail}. Dərhal müdaxilə tələb olunur!`;

    if (existingActive) {
      const alert = await tx.criticalAlert.update({
        where: { id: existingActive.id },
        data: {
          sosCount: cluster.sosCount,
          centerLat: cluster.centerLat,
          centerLng: cluster.centerLng,
          message,
        },
        include: { zone: true, assemblyPoint: true },
      });
      return { alert, isNew: false };
    }

    await tx.zone.update({
      where: { id: triggerSos.zoneId },
      data: { riskLevel: 'CRITICAL' },
    });
    const alert = await tx.criticalAlert.create({
      data: {
        alertType: 'SOS_CLUSTER',
        zoneId: triggerSos.zoneId,
        centerLat: cluster.centerLat,
        centerLng: cluster.centerLng,
        sosCount: cluster.sosCount,
        title: RED_ALERT_TITLE,
        message,
        status: 'ACTIVE',
      },
      include: { zone: true, assemblyPoint: true },
    });
    return { alert, isNew: true };
  });

  if (!outcome) return null;
  emitAlertCreated(io, outcome.alert, 'SOS_CLUSTER');
  return outcome.alert;
}

/**
 * Flood-safe entry point used by the SOS endpoint (Challenge Drop #3).
 * Evaluations are coalesced per zone (one running + one queued), and a failure
 * of the analytics never fails an SOS that is already stored.
 */
const sosEvaluationCoalescer = createCoalescer(async ({ sos, io }) => evaluateSosCrisis(sos, io));

export async function scheduleSosEvaluation(sos, io) {
  try {
    return await sosEvaluationCoalescer(sos.zoneId, { sos, io });
  } catch (err) {
    console.error('Crisis evaluation failed (SOS is stored, will be re-evaluated on the next signal):', err.message);
    return null;
  }
}

/**
 * Evaluate >95% capacity overflow condition when assembly point occupancy changes.
 */
export async function evaluateCapacityCrisis(assemblyPointId, io) {
  const point = await prisma.assemblyPoint.findUnique({
    where: { id: Number(assemblyPointId) },
    include: { zone: true },
  });

  if (!point) return null;

  const overflow = detectCapacityOverflow(point.currentOccupancy, point.capacity);
  if (!overflow) return null;

  if (overflow.occupancyPercent >= 100 && point.status === 'OPEN') {
    await prisma.assemblyPoint.update({
      where: { id: point.id },
      data: { status: 'FULL' },
    });
  }

  const message = `${point.name} (${point.zone.name}) doluluğu ${overflow.occupancyPercent}%-ə çatdı (95% kritik həddi keçdi).`;

  const alert = await prisma.$transaction(async (tx) => {
    await lockKey(tx, `capacity:${point.id}`);

    const existingActive = await tx.criticalAlert.findFirst({
      where: { alertType: 'CAPACITY_OVERFLOW', assemblyPointId: point.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingActive) {
      return tx.criticalAlert.update({
        where: { id: existingActive.id },
        data: { occupancyPercent: overflow.occupancyPercent, message },
        include: { zone: true, assemblyPoint: true },
      });
    }

    // After an operator executed/dismissed an overflow alert for this point,
    // re-raise only if occupancy climbs above the level they already handled.
    const lastResolved = await tx.criticalAlert.findFirst({
      where: {
        alertType: 'CAPACITY_OVERFLOW',
        assemblyPointId: point.id,
        resolvedAt: { not: null },
      },
      orderBy: { resolvedAt: 'desc' },
      select: { occupancyPercent: true },
    });
    if (!shouldRaiseCapacityAlert(overflow.occupancyPercent, lastResolved?.occupancyPercent)) {
      return null;
    }

    await tx.zone.update({
      where: { id: point.zoneId },
      data: { riskLevel: 'CRITICAL' },
    });
    return tx.criticalAlert.create({
      data: {
        alertType: 'CAPACITY_OVERFLOW',
        zoneId: point.zoneId,
        assemblyPointId: point.id,
        centerLat: point.lat,
        centerLng: point.lng,
        occupancyPercent: overflow.occupancyPercent,
        title: RED_ALERT_TITLE,
        message,
        status: 'ACTIVE',
      },
      include: { zone: true, assemblyPoint: true },
    });
  });

  if (!alert) return null;
  emitAlertCreated(io, alert, 'CAPACITY_OVERFLOW');
  return alert;
}

/**
 * Atomically switch one STANDBY assembly point to OPEN (same zone preferred).
 * Conditional update = lock: two concurrent executions never open the same point.
 */
async function claimStandbyPoint(tx, zoneId) {
  const standby = await tx.assemblyPoint.findMany({
    where: { status: 'STANDBY' },
    orderBy: { id: 'asc' },
  });
  const ranked = [
    ...standby.filter((p) => p.zoneId === zoneId),
    ...standby.filter((p) => p.zoneId !== zoneId),
  ];
  for (const point of ranked) {
    const { count } = await tx.assemblyPoint.updateMany({
      where: { id: point.id, status: 'STANDBY' },
      data: { status: 'OPEN' },
    });
    if (count === 1) return tx.assemblyPoint.findUnique({ where: { id: point.id } });
  }
  return null;
}

/**
 * One-click Red Alert execution: dispatch additional rescue brigade + open new assembly point.
 * The alert row is locked (SELECT ... FOR UPDATE), so simultaneous clicks by two
 * dispatchers result in exactly one execution; the second gets `alreadyExecuted`.
 */
export async function executeCriticalAlert(alertId, io, dispatcher = null) {
  const id = Number(alertId);
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`SELECT id FROM critical_alerts WHERE id = ${id} FOR UPDATE`;
    if (locked.length === 0) {
      throw notFound('ALERT_NOT_FOUND', 'Critical alert not found');
    }

    const alert = await tx.criticalAlert.findUnique({
      where: { id },
      include: { zone: true, assemblyPoint: true },
    });

    if (alert.status === 'EXECUTED') {
      return { alert, alreadyExecuted: true };
    }
    if (alert.status === 'DISMISSED') {
      throw conflict('ALERT_DISMISSED', 'Dismissed alerts cannot be executed');
    }

    // 1. Dispatch an available/standby brigade (prefer same zone)
    const missionLocation = {
      zoneId: alert.zoneId,
      lat: alert.centerLat,
      lng: alert.centerLng,
    };
    let brigade = await claimBrigade(tx, {
      zoneId: alert.zoneId,
      preferUnitTypes: ['SEARCH_RESCUE', 'GENERAL'],
      data: missionLocation,
    });

    if (!brigade) {
      const suffix = `${alert.id}-${String(Date.now()).slice(-4)}`;
      brigade = await tx.rescueBrigade.create({
        data: {
          code: `BRG-EMG-${suffix}`,
          name: `${alert.zone.name} Ehtiyat Çevik Briqadası #${suffix}`,
          unitType: 'SEARCH_RESCUE',
          status: 'DISPATCHED',
          ...missionLocation,
        },
      });
    }

    // Assign pending SOS signals in this zone to the dispatched brigade
    await tx.sosSignal.updateMany({
      where: {
        zoneId: alert.zoneId,
        citizenStatus: 'SOS',
        status: 'PENDING',
      },
      data: {
        status: 'DISPATCHED',
        assignedBrigadeId: brigade.id,
      },
    });

    // 2. Open a STANDBY assembly point (same zone first) or provision a mobile one
    let openedPoint = await claimStandbyPoint(tx, alert.zoneId);

    if (!openedPoint) {
      const nearestNode = await tx.roadNode.findFirst({
        where: { zoneId: alert.zoneId },
        orderBy: { id: 'asc' },
      });
      const suffix = `${alert.id}-${String(Date.now()).slice(-4)}`;
      openedPoint = await tx.assemblyPoint.create({
        data: {
          code: `AP-MOB-${suffix}`,
          name: `${alert.zone.name} Mobil Təxliyə Məntəqəsi #${suffix}`,
          type: 'SHELTER',
          zoneId: alert.zoneId,
          nodeId: nearestNode?.id ?? null,
          lat: Number((alert.centerLat + 0.0025).toFixed(6)),
          lng: Number((alert.centerLng + 0.0025).toFixed(6)),
          address: `${alert.zone.name}, Fövqəladə Mobil Çadır Düşərgəsi`,
          capacity: 800,
          currentOccupancy: 0,
          status: 'OPEN',
          isEmergencyReserve: true,
        },
      });
    }

    // 3. Mark alert as EXECUTED
    const actionTaken = {
      dispatchedBrigade: {
        id: brigade.id,
        code: brigade.code,
        name: brigade.name,
      },
      openedAssemblyPoint: {
        id: openedPoint.id,
        code: openedPoint.code,
        name: openedPoint.name,
        capacity: openedPoint.capacity,
      },
      executedBy: dispatcher
        ? {
            id: dispatcher.id,
            username: dispatcher.username,
            badgeCode: dispatcher.badgeCode,
          }
        : null,
    };

    const now = new Date();
    const updatedAlert = await tx.criticalAlert.update({
      where: { id: alert.id },
      data: {
        status: 'EXECUTED',
        executedAt: now,
        resolvedAt: now,
        executedByDispatcherId: dispatcher?.id ?? null,
        actionTaken,
      },
      include: { zone: true, assemblyPoint: true },
    });

    await tx.zone.update({
      where: { id: alert.zoneId },
      data: { riskLevel: 'HIGH' },
    });

    return {
      alert: updatedAlert,
      dispatchedBrigade: brigade,
      openedAssemblyPoint: openedPoint,
      alreadyExecuted: false,
    };
  });

  if (!result.alreadyExecuted) {
    emitAlertResolved(io, result, 'ALERT_EXECUTED');
  }

  return result;
}

/**
 * Operator decides an ACTIVE alert needs no action. Recorded with who/when;
 * signals before this moment no longer count toward a new cluster alert.
 */
export async function dismissCriticalAlert(alertId, io, dispatcher = null) {
  const id = Number(alertId);
  const now = new Date();
  const { count } = await prisma.criticalAlert.updateMany({
    where: { id, status: 'ACTIVE' },
    data: {
      status: 'DISMISSED',
      resolvedAt: now,
      actionTaken: {
        dismissedBy: dispatcher
          ? { id: dispatcher.id, username: dispatcher.username, badgeCode: dispatcher.badgeCode }
          : null,
        dismissedAt: now.toISOString(),
      },
    },
  });

  if (count === 0) {
    const existing = await prisma.criticalAlert.findUnique({ where: { id } });
    if (!existing) throw notFound('ALERT_NOT_FOUND', 'Critical alert not found');
    throw conflict('ALERT_NOT_ACTIVE', 'Only active alerts can be dismissed');
  }

  const alert = await prisma.criticalAlert.findUnique({
    where: { id },
    include: { zone: true, assemblyPoint: true },
  });
  emitAlertResolved(io, { alert }, 'ALERT_DISMISSED');
  return alert;
}
