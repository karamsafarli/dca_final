import { prisma } from '../config/db.js';
import { evaluateCapacityCrisis } from './crisisEngineService.js';
import { calculateOccupancyPercent } from './geometryService.js';

/**
 * Fetch complete live operational snapshot for the Emergency Dispatcher Dashboard.
 */
export async function getDispatcherDashboard() {
  const [zones, assemblyPoints, sosSignals, rescueBrigades, roads, alerts] =
    await Promise.all([
      prisma.zone.findMany({ orderBy: { id: 'asc' } }),
      prisma.assemblyPoint.findMany({
        include: { zone: true },
        orderBy: [{ status: 'asc' }, { id: 'asc' }],
      }),
      prisma.sosSignal.findMany({
        include: { zone: true, assignedBrigade: true },
        orderBy: [{ priorityLevel: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      prisma.rescueBrigade.findMany({
        include: { zone: true },
        orderBy: { id: 'asc' },
      }),
      prisma.roadSegment.findMany({
        include: { zone: true },
        orderBy: { id: 'asc' },
      }),
      prisma.criticalAlert.findMany({
        include: { zone: true, assemblyPoint: true },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 30,
      }),
    ]);

  const enrichedPoints = assemblyPoints.map((ap) => ({
    ...ap,
    occupancyPercent: calculateOccupancyPercent(ap.currentOccupancy, ap.capacity),
  }));

  const enrichedZones = zones.map((zone) => {
    const activeSosCount = sosSignals.filter(
      (s) => s.zoneId === zone.id && s.citizenStatus === 'SOS' && s.status !== 'RESOLVED'
    ).length;
    const openSheltersCount = enrichedPoints.filter(
      (ap) => ap.zoneId === zone.id && ap.status === 'OPEN'
    ).length;
    const activeBrigadesCount = rescueBrigades.filter(
      (b) => b.zoneId === zone.id && b.status === 'DISPATCHED'
    ).length;

    return {
      ...zone,
      activeSosCount,
      openSheltersCount,
      activeBrigadesCount,
    };
  });

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  const summary = {
    activeSosCount: sosSignals.filter(
      (s) => s.citizenStatus === 'SOS' && s.status !== 'RESOLVED'
    ).length,
    prioritySosCount: sosSignals.filter(
      (s) =>
        s.citizenStatus === 'SOS' &&
        s.status !== 'RESOLVED' &&
        s.priorityLevel === 1
    ).length,
    pendingSosCount: sosSignals.filter(
      (s) => s.citizenStatus === 'SOS' && s.status === 'PENDING'
    ).length,
    safeConfirmationsCount: sosSignals.filter((s) => s.citizenStatus === 'SAFE').length,
    dispatchedBrigadesCount: rescueBrigades.filter((b) => b.status === 'DISPATCHED')
      .length,
    availableBrigadesCount: rescueBrigades.filter((b) => b.status !== 'DISPATCHED')
      .length,
    openSheltersCount: enrichedPoints.filter((ap) => ap.status === 'OPEN').length,
    crowdedSheltersCount: enrichedPoints.filter(
      (ap) => ap.status === 'OPEN' && ap.occupancyPercent >= 90
    ).length,
    closedRoadsCount: roads.filter((r) => r.status === 'CLOSED').length,
    activeAlertsCount: activeAlerts.length,
  };

  return {
    summary,
    zones: enrichedZones,
    assemblyPoints: enrichedPoints,
    sosSignals,
    rescueBrigades,
    roads,
    alerts,
  };
}

/**
 * Update a road segment's traffic status (OPEN / CONGESTED / CLOSED).
 */
export async function updateRoadStatus(roadId, { status, closureReason }, io) {
  const existing = await prisma.roadSegment.findUnique({
    where: { id: Number(roadId) },
  });
  if (!existing) {
    const err = new Error('Road segment not found');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.roadSegment.update({
    where: { id: Number(roadId) },
    data: {
      status,
      closureReason:
        status === 'OPEN' ? null : closureReason || existing.closureReason || 'Fövqəladə yol bağlanması',
    },
    include: { zone: true },
  });

  if (io) {
    io.emit('road:updated', updated);
    io.emit('state:updated', { reason: 'ROAD_STATUS_CHANGED', roadId: updated.id });
  }

  return updated;
}

/**
 * Update an assembly point's current occupancy or status and check >95% overflow alert.
 */
export async function updateAssemblyPointOccupancy(
  pointId,
  { currentOccupancy, occupancyPercent, status },
  io
) {
  const existing = await prisma.assemblyPoint.findUnique({
    where: { id: Number(pointId) },
  });
  if (!existing) {
    const err = new Error('Assembly point not found');
    err.statusCode = 404;
    throw err;
  }

  let nextOccupancy = existing.currentOccupancy;
  if (occupancyPercent !== undefined && occupancyPercent !== null) {
    nextOccupancy = Math.round((Number(occupancyPercent) / 100) * existing.capacity);
  } else if (currentOccupancy !== undefined && currentOccupancy !== null) {
    nextOccupancy = Math.max(0, Number(currentOccupancy));
  }

  const nextPercent = calculateOccupancyPercent(nextOccupancy, existing.capacity);
  const nextStatus =
    status ||
    (nextPercent >= 100
      ? 'FULL'
      : existing.status === 'FULL' && nextPercent < 100
      ? 'OPEN'
      : existing.status);

  const updated = await prisma.assemblyPoint.update({
    where: { id: Number(pointId) },
    data: {
      currentOccupancy: nextOccupancy,
      status: nextStatus,
    },
    include: { zone: true },
  });

  const enriched = {
    ...updated,
    occupancyPercent: nextPercent,
  };

  if (io) {
    io.emit('shelter:updated', enriched);
    io.emit('state:updated', { reason: 'OCCUPANCY_CHANGED', assemblyPointId: updated.id });
  }

  const triggeredAlert = await evaluateCapacityCrisis(updated.id, io);

  return {
    assemblyPoint: enriched,
    triggeredAlert,
  };
}
