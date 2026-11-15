import { CRISIS_THRESHOLDS } from '../config/constants.js';
import { prisma } from '../config/db.js';
import {
  calculateOccupancyPercent,
  haversineDistanceMeters,
} from './geometryService.js';

export const RED_ALERT_TITLE =
  'Qırmızı Həyəcan: Əlavə xilasetmə briqadası göndər və yeni toplanış nöqtəsi aç';

/**
 * Pure detector for SOS clustering: >= 4 SOS signals in 5 min within same zone OR 500m radius.
 */
export function detectSosCluster(triggerSos, activeRecentSignals) {
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
 * Evaluate SOS cluster conditions after a new SOS signal arrives.
 */
export async function evaluateSosCrisis(triggerSos, io) {
  const windowStart = new Date(
    Date.now() - CRISIS_THRESHOLDS.SOS_CLUSTER_WINDOW_MINUTES * 60 * 1000
  );

  const recentActiveSignals = await prisma.sosSignal.findMany({
    where: {
      citizenStatus: 'SOS',
      status: { not: 'RESOLVED' },
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'desc' },
  });

  const cluster = detectSosCluster(triggerSos, recentActiveSignals);
  if (!cluster) return null;

  const zone = await prisma.zone.findUnique({
    where: { id: triggerSos.zoneId },
  });

  const existingActive = await prisma.criticalAlert.findFirst({
    where: {
      alertType: 'SOS_CLUSTER',
      zoneId: triggerSos.zoneId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });

  const reasonDetail = cluster.triggeredByRadius
    ? `500 metr radiusda son 5 dəqiqədə ${cluster.sosCount} aktiv SOS siqnalı qeydə alındı`
    : `${zone?.name || 'Zona'} üzrə son 5 dəqiqədə ${cluster.sosCount} aktiv SOS siqnalı qeydə alındı`;

  let alert;
  if (existingActive) {
    alert = await prisma.criticalAlert.update({
      where: { id: existingActive.id },
      data: {
        sosCount: cluster.sosCount,
        centerLat: cluster.centerLat,
        centerLng: cluster.centerLng,
        message: `${reasonDetail}. Dərhal müdaxilə tələb olunur!`,
      },
      include: { zone: true, assemblyPoint: true },
    });
  } else {
    alert = await prisma.$transaction(async (tx) => {
      await tx.zone.update({
        where: { id: triggerSos.zoneId },
        data: { riskLevel: 'CRITICAL' },
      });

      return tx.criticalAlert.create({
        data: {
          alertType: 'SOS_CLUSTER',
          zoneId: triggerSos.zoneId,
          centerLat: cluster.centerLat,
          centerLng: cluster.centerLng,
          sosCount: cluster.sosCount,
          title: RED_ALERT_TITLE,
          message: `${reasonDetail}. Dərhal müdaxilə tələb olunur!`,
          status: 'ACTIVE',
        },
        include: { zone: true, assemblyPoint: true },
      });
    });
  }

  if (io) {
    io.to('dispatchers').emit('alert:created', alert);
    io.emit('state:updated', { reason: 'SOS_CLUSTER', zoneId: triggerSos.zoneId });
  }

  return alert;
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

  const existingActive = await prisma.criticalAlert.findFirst({
    where: {
      alertType: 'CAPACITY_OVERFLOW',
      assemblyPointId: point.id,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });

  const message = `${point.name} (${point.zone.name}) doluluğu ${overflow.occupancyPercent}%-ə çatdı (95% kritik həddi keçdi).`;

  let alert;
  if (existingActive) {
    alert = await prisma.criticalAlert.update({
      where: { id: existingActive.id },
      data: {
        occupancyPercent: overflow.occupancyPercent,
        message,
      },
      include: { zone: true, assemblyPoint: true },
    });
  } else {
    alert = await prisma.$transaction(async (tx) => {
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
  }

  if (io) {
    io.to('dispatchers').emit('alert:created', alert);
    io.emit('state:updated', {
      reason: 'CAPACITY_OVERFLOW',
      assemblyPointId: point.id,
    });
  }

  return alert;
}

/**
 * One-click Red Alert execution: dispatch additional rescue brigade + open new assembly point.
 */
export async function executeCriticalAlert(alertId, io, dispatcher = null) {
  const result = await prisma.$transaction(async (tx) => {
    const alert = await tx.criticalAlert.findUnique({
      where: { id: Number(alertId) },
      include: { zone: true, assemblyPoint: true },
    });

    if (!alert) {
      const error = new Error('Critical alert not found');
      error.statusCode = 404;
      throw error;
    }

    if (alert.status === 'EXECUTED') {
      return { alert, alreadyExecuted: true };
    }

    // 1. Dispatch an available/standby brigade (prefer same zone)
    let brigade = await tx.rescueBrigade.findFirst({
      where: {
        zoneId: alert.zoneId,
        status: { in: ['STANDBY', 'AVAILABLE'] },
      },
      orderBy: { status: 'asc' },
    });

    if (!brigade) {
      brigade = await tx.rescueBrigade.findFirst({
        where: { status: { in: ['STANDBY', 'AVAILABLE'] } },
        orderBy: { status: 'asc' },
      });
    }

    if (brigade) {
      brigade = await tx.rescueBrigade.update({
        where: { id: brigade.id },
        data: {
          status: 'DISPATCHED',
          zoneId: alert.zoneId,
          lat: alert.centerLat,
          lng: alert.centerLng,
        },
      });
    } else {
      const suffix = String(Date.now()).slice(-4);
      brigade = await tx.rescueBrigade.create({
        data: {
          code: `BRG-EMG-${suffix}`,
          name: `${alert.zone.name} Ehtiyat Çevik Briqadası #${suffix}`,
          unitType: 'SEARCH_RESCUE',
          zoneId: alert.zoneId,
          lat: alert.centerLat,
          lng: alert.centerLng,
          status: 'DISPATCHED',
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

    // 2. Open a STANDBY assembly point in the zone (or provision mobile point)
    let openedPoint = await tx.assemblyPoint.findFirst({
      where: {
        zoneId: alert.zoneId,
        status: 'STANDBY',
      },
      orderBy: { id: 'asc' },
    });

    if (!openedPoint) {
      openedPoint = await tx.assemblyPoint.findFirst({
        where: { status: 'STANDBY' },
        orderBy: { id: 'asc' },
      });
    }

    if (openedPoint) {
      openedPoint = await tx.assemblyPoint.update({
        where: { id: openedPoint.id },
        data: { status: 'OPEN' },
      });
    } else {
      const zoneNodes = await tx.roadNode.findMany({
        where: { zoneId: alert.zoneId },
      });
      const nearestNode = zoneNodes[0] || null;
      const suffix = String(Date.now()).slice(-4);
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

    const updatedAlert = await tx.criticalAlert.update({
      where: { id: alert.id },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
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

  if (io && !result.alreadyExecuted) {
    io.emit('alert:executed', result);
    io.emit('state:updated', {
      reason: 'ALERT_EXECUTED',
      alertId: result.alert.id,
    });
  }

  return result;
}
