import { prisma } from '../config/db.js';
import { evaluateSosCrisis } from './crisisEngineService.js';
import { findNearestZone } from './geometryService.js';

/**
 * Create a new citizen SOS signal and evaluate Critical Crisis rules.
 */
export async function createSosSignal(payload, io) {
  const zones = await prisma.zone.findMany();
  let zoneId = payload.zoneId ? Number(payload.zoneId) : null;

  let lat = payload.lat !== undefined ? Number(payload.lat) : null;
  let lng = payload.lng !== undefined ? Number(payload.lng) : null;

  if (zoneId && (lat === null || lng === null)) {
    const z = zones.find((item) => item.id === zoneId);
    if (z) {
      lat = z.centerLat;
      lng = z.centerLng;
    }
  }

  if (!zoneId && lat !== null && lng !== null) {
    const nearest = findNearestZone(lat, lng, zones);
    zoneId = nearest?.id ?? zones[0]?.id;
  }

  if (!zoneId || lat === null || lng === null) {
    const error = new Error('Valid zoneId or coordinates (lat, lng) are required');
    error.statusCode = 400;
    throw error;
  }

  const citizenCategory =
    payload.citizenCategory === 'SPECIAL_CARE' ? 'SPECIAL_CARE' : 'STANDARD';
  const priorityLevel = citizenCategory === 'SPECIAL_CARE' ? 1 : 2;

  const citizenCode =
    payload.citizenCode?.trim() ||
    `CIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

  const sos = await prisma.sosSignal.create({
    data: {
      citizenCode,
      citizenName: payload.citizenName?.trim() || 'Anonim Vətəndaş',
      phone: payload.phone?.trim() || null,
      hazardType: payload.hazardType,
      citizenStatus: 'SOS',
      citizenCategory,
      priorityLevel,
      zoneId,
      lat,
      lng,
      notes: payload.notes?.trim() || null,
      status: 'PENDING',
    },
    include: {
      zone: true,
      assignedBrigade: true,
    },
  });

  if (io) {
    io.to('dispatchers').emit('sos:created', sos);
    io.emit('state:updated', { reason: 'SOS_CREATED', sosId: sos.id });
  }

  const triggeredAlert = await evaluateSosCrisis(sos, io);

  return {
    sos,
    triggeredAlert,
  };
}

/**
 * Update citizen safety status to SAFE ("Təhlükəsizəm").
 */
export async function markCitizenSafe({ sosId, citizenCode }, io) {
  let target = null;

  if (sosId) {
    target = await prisma.sosSignal.findUnique({
      where: { id: Number(sosId) },
    });
  } else if (citizenCode) {
    target = await prisma.sosSignal.findFirst({
      where: { citizenCode, citizenStatus: 'SOS' },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!target) {
    // Allow citizen without prior SOS to still log their SAFE confirmation
    if (citizenCode) {
      const zones = await prisma.zone.findMany();
      const defaultZone = zones[0];
      const safeRecord = await prisma.sosSignal.create({
        data: {
          citizenCode,
          citizenName: 'Vətəndaş',
          hazardType: 'MEDICAL',
          citizenStatus: 'SAFE',
          zoneId: defaultZone.id,
          lat: defaultZone.centerLat,
          lng: defaultZone.centerLng,
          status: 'RESOLVED',
          notes: 'Vətəndaş özünü təhlükəsiz kimi təsdiqlədi',
        },
        include: { zone: true },
      });
      if (io) {
        io.emit('sos:updated', safeRecord);
        io.emit('state:updated', { reason: 'CITIZEN_SAFE', sosId: safeRecord.id });
      }
      return safeRecord;
    }

    const error = new Error('SOS signal not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const sos = await tx.sosSignal.update({
      where: { id: target.id },
      data: {
        citizenStatus: 'SAFE',
        status: 'RESOLVED',
      },
      include: { zone: true, assignedBrigade: true },
    });

    if (target.assignedBrigadeId) {
      const otherActive = await tx.sosSignal.count({
        where: {
          assignedBrigadeId: target.assignedBrigadeId,
          status: { not: 'RESOLVED' },
        },
      });
      if (otherActive === 0) {
        await tx.rescueBrigade.update({
          where: { id: target.assignedBrigadeId },
          data: { status: 'AVAILABLE', currentSosId: null },
        });
      }
    }

    return sos;
  });

  if (io) {
    io.emit('sos:updated', updated);
    io.emit('state:updated', { reason: 'CITIZEN_SAFE', sosId: updated.id });
  }

  return updated;
}

/**
 * Manually dispatch an available brigade to a specific SOS signal.
 */
export async function dispatchBrigadeToSos(sosId, brigadeId, io) {
  const result = await prisma.$transaction(async (tx) => {
    const sos = await tx.sosSignal.findUnique({ where: { id: Number(sosId) } });
    if (!sos) {
      const err = new Error('SOS signal not found');
      err.statusCode = 404;
      throw err;
    }

    let brigade = null;
    if (brigadeId) {
      brigade = await tx.rescueBrigade.findUnique({
        where: { id: Number(brigadeId) },
      });
    } else {
      brigade = await tx.rescueBrigade.findFirst({
        where: {
          zoneId: sos.zoneId,
          status: { in: ['AVAILABLE', 'STANDBY'] },
        },
      });
      if (!brigade) {
        brigade = await tx.rescueBrigade.findFirst({
          where: { status: { in: ['AVAILABLE', 'STANDBY'] } },
        });
      }
    }

    if (!brigade) {
      const err = new Error('No available rescue brigade found');
      err.statusCode = 409;
      throw err;
    }

    const updatedBrigade = await tx.rescueBrigade.update({
      where: { id: brigade.id },
      data: {
        status: 'DISPATCHED',
        currentSosId: sos.id,
        lat: sos.lat,
        lng: sos.lng,
      },
    });

    const updatedSos = await tx.sosSignal.update({
      where: { id: sos.id },
      data: {
        status: 'DISPATCHED',
        assignedBrigadeId: brigade.id,
      },
      include: { zone: true, assignedBrigade: true },
    });

    return { sos: updatedSos, brigade: updatedBrigade };
  });

  if (io) {
    io.emit('sos:updated', result.sos);
    io.emit('state:updated', { reason: 'BRIGADE_DISPATCHED', sosId: result.sos.id });
  }

  return result;
}
