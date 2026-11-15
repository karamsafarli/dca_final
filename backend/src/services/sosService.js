import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { emitSosCreated, emitSosUpdated } from '../realtime/events.js';
import { badRequest, forbidden, notFound, conflict } from '../utils/errors.js';
import { claimBrigade } from './brigadeAllocation.js';
import { evaluateSosCrisis } from './crisisEngineService.js';
import { findNearestZone } from './geometryService.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** Random, unguessable token given only to the citizen who created the SOS. */
export function generateSosAccessToken() {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Constant-time check that `accessToken` belongs to SOS `sosId`.
 */
export async function verifySosAccessToken(sosId, accessToken) {
  if (!Number.isInteger(sosId) || sosId <= 0) return false;
  if (typeof accessToken !== 'string' || accessToken.length < 16) return false;

  const record = await prisma.sosSignal.findUnique({
    where: { id: sosId },
    select: { accessTokenHash: true },
  });
  if (!record?.accessTokenHash) return false;

  const expected = Buffer.from(record.accessTokenHash, 'hex');
  const actual = Buffer.from(sha256(accessToken), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * Create a new citizen SOS signal and evaluate Critical Crisis rules.
 * Returns the one-time `accessToken` the citizen needs to update or follow this SOS.
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

  if (!zoneId || lat === null || lng === null || !zones.some((z) => z.id === zoneId)) {
    throw badRequest('LOCATION_REQUIRED', 'Valid zoneId or coordinates (lat, lng) are required');
  }

  const citizenCategory =
    payload.citizenCategory === 'SPECIAL_CARE' ? 'SPECIAL_CARE' : 'STANDARD';
  const priorityLevel = citizenCategory === 'SPECIAL_CARE' ? 1 : 2;

  const citizenCode = payload.citizenCode?.trim() || `CIT-${crypto.randomUUID()}`;
  const accessToken = generateSosAccessToken();

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
      accessTokenHash: sha256(accessToken),
    },
    include: {
      zone: true,
      assignedBrigade: true,
    },
  });

  emitSosCreated(io, sos);

  const triggeredAlert = await evaluateSosCrisis(sos, io);

  return {
    sos,
    accessToken,
    triggeredAlert,
  };
}

/**
 * Update citizen safety status to SAFE ("Təhlükəsizəm").
 * - With `sosId`: closes that SOS, but only with its access token (ownership proof).
 * - With only `citizenCode`: records a standalone SAFE check-in and never touches
 *   existing SOS records (a citizen code is not a secret).
 */
export async function markCitizenSafe({ sosId, accessToken, citizenCode, zoneId, lat, lng }, io) {
  if (sosId) {
    const target = await prisma.sosSignal.findUnique({ where: { id: Number(sosId) } });
    if (!target) throw notFound('SOS_NOT_FOUND', 'SOS signal not found');

    const owns = await verifySosAccessToken(Number(sosId), accessToken);
    if (!owns) throw forbidden('SOS_ACCESS_DENIED', 'Invalid SOS access token');

    const updated = await prisma.$transaction(async (tx) => {
      const sos = await tx.sosSignal.update({
        where: { id: target.id },
        data: { citizenStatus: 'SAFE', status: 'RESOLVED' },
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

    emitSosUpdated(io, updated, 'CITIZEN_SAFE');
    return updated;
  }

  // Standalone SAFE check-in (no prior SOS from this device)
  const zones = await prisma.zone.findMany({ orderBy: { id: 'asc' } });
  let zone = zoneId ? zones.find((z) => z.id === Number(zoneId)) : null;
  if (!zone && lat !== undefined && lng !== undefined) {
    zone = findNearestZone(Number(lat), Number(lng), zones);
  }
  zone = zone || zones[0];
  if (!zone) throw notFound('ZONE_NOT_FOUND', 'No zones configured');

  const checkIn = await prisma.sosSignal.create({
    data: {
      citizenCode,
      citizenName: 'Vətəndaş',
      hazardType: 'MEDICAL',
      citizenStatus: 'SAFE',
      zoneId: zone.id,
      lat: lat !== undefined ? Number(lat) : zone.centerLat,
      lng: lng !== undefined ? Number(lng) : zone.centerLng,
      status: 'RESOLVED',
      notes: 'Vətəndaş özünü təhlükəsiz kimi təsdiqlədi',
    },
    include: { zone: true },
  });

  emitSosUpdated(io, checkIn, 'CITIZEN_SAFE');
  return checkIn;
}

/**
 * Dispatch a free brigade to a specific SOS.
 * Priority #1 (special-care) SOS prefers MEDICAL units (medical transport).
 * An explicitly chosen brigade must be free, otherwise HTTP 409.
 */
export async function dispatchBrigadeToSos(sosId, brigadeId, io) {
  const result = await prisma.$transaction(async (tx) => {
    const sos = await tx.sosSignal.findUnique({ where: { id: Number(sosId) } });
    if (!sos) throw notFound('SOS_NOT_FOUND', 'SOS signal not found');
    if (sos.status === 'RESOLVED') {
      throw conflict('SOS_ALREADY_RESOLVED', 'SOS signal is already resolved');
    }

    const brigade = await claimBrigade(tx, {
      brigadeId,
      zoneId: sos.zoneId,
      preferUnitTypes:
        sos.priorityLevel === 1 || sos.hazardType === 'MEDICAL'
          ? ['MEDICAL']
          : sos.hazardType === 'FIRE'
          ? ['FIRE']
          : [],
      data: { currentSosId: sos.id, lat: sos.lat, lng: sos.lng },
    });

    if (!brigade) {
      throw conflict('NO_BRIGADE_AVAILABLE', 'No available rescue brigade found');
    }

    const updatedSos = await tx.sosSignal.update({
      where: { id: sos.id },
      data: { status: 'DISPATCHED', assignedBrigadeId: brigade.id },
      include: { zone: true, assignedBrigade: true },
    });

    return { sos: updatedSos, brigade };
  });

  emitSosUpdated(io, result.sos, 'BRIGADE_DISPATCHED');
  return result;
}
