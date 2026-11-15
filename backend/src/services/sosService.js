import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { emitSosCreated, emitSosUpdated, emitStateUpdated } from '../realtime/events.js';
import { badRequest, forbidden, notFound, conflict } from '../utils/errors.js';
import { claimBrigade } from './brigadeAllocation.js';
import { SOS_FLOOD_CONFIG } from '../config/constants.js';
import { singleFlight } from '../resilience/coalesce.js';
import { scheduleSosEvaluation } from './crisisEngineService.js';
import { findNearestZone } from './geometryService.js';
import { getZonesCached } from './zoneCache.js';

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

const collapseIdenticalRequests = singleFlight();

/**
 * In-memory index of recent SOS per duplicate key (key -> { sosId, at }).
 * New citizens skip the duplicate DB lookup entirely; the DB is consulted only
 * for keys seen before, or right after a restart (index still warming up).
 */
const recentSosByKey = new Map();
let processStartedAt = Date.now();
const windowMs = () => SOS_FLOOD_CONFIG.DUPLICATE_WINDOW_SECONDS * 1000;

function rememberSos(key, sosId) {
  recentSosByKey.set(key, { sosId, at: Date.now() });
  if (recentSosByKey.size > 50000) {
    const cutoff = Date.now() - windowMs();
    for (const [k, v] of recentSosByKey) if (v.at < cutoff) recentSosByKey.delete(k);
  }
}

export function resetDuplicateIndex({ warm = false } = {}) {
  recentSosByKey.clear();
  // Tests can simulate a long-running process whose index is already warm
  processStartedAt = warm ? 0 : Date.now();
}

/** Same citizen + same hazard = same emergency (duplicate filter key). */
export const duplicateKey = (citizenCode, hazardType) =>
  citizenCode ? `${citizenCode.trim()}|${hazardType}` : null;

/**
 * Create a citizen SOS (Challenge Drop #3: flood-safe).
 * - Concurrent identical requests (same citizen + hazard) collapse into one.
 * - A repeat within SOS_DUPLICATE_WINDOW_SECONDS returns the existing active SOS
 *   (`duplicate: true`, HTTP 200) instead of creating another record, so spam
 *   cannot bury real signals in the dispatcher queue.
 * Returns the one-time `accessToken` only to the request that created the SOS.
 */
export async function createSosSignal(payload, io) {
  const key = duplicateKey(payload.citizenCode, payload.hazardType);
  if (!key) return createNewSos(payload, io);

  const { shared, value } = await collapseIdenticalRequests(key, () => createOrReuseSos(payload, io));
  if (!shared) return value;
  return { sos: value.sos, duplicate: true, triggeredAlert: null };
}

async function createOrReuseSos(payload, io) {
  const key = duplicateKey(payload.citizenCode, payload.hazardType);
  const known = recentSosByKey.get(key);
  const indexWarm = Date.now() - processStartedAt > windowMs();
  if (indexWarm && (!known || Date.now() - known.at > windowMs())) {
    const created = await createNewSos(payload, io);
    rememberSos(key, created.sos.id);
    return created;
  }

  const since = new Date(Date.now() - windowMs());
  const existing = await prisma.sosSignal.findFirst({
    where: {
      citizenCode: payload.citizenCode.trim(),
      hazardType: payload.hazardType,
      citizenStatus: 'SOS',
      status: { not: 'RESOLVED' },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    include: { zone: true, assignedBrigade: true },
  });
  if (existing) return { sos: existing, duplicate: true, triggeredAlert: null };
  const created = await createNewSos(payload, io);
  rememberSos(key, created.sos.id);
  return created;
}

async function createNewSos(payload, io) {
  const zones = await getZonesCached();
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
  // Priority #1: special-care citizens (Challenge Drop #1) and anyone who cannot
  // reach an assembly point on their own and needs transport evacuation.
  const priorityLevel = citizenCategory === 'SPECIAL_CARE' || payload.needsTransport ? 1 : 2;

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
  });
  // Relations from cache instead of 2 extra SELECTs per SOS (flood hot path)
  sos.zone = zones.find((z) => z.id === zoneId) ?? null;
  sos.assignedBrigade = null;

  emitSosCreated(io, sos);

  // Wait for the crisis evaluation only within the latency budget; it always
  // completes (and pushes any Red Alert to dispatchers) in the background.
  const evaluation = scheduleSosEvaluation(sos, io);
  const triggeredAlert = await Promise.race([
    evaluation,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), SOS_FLOOD_CONFIG.EVALUATION_BUDGET_MS).unref?.();
    }),
  ]);

  return {
    sos,
    accessToken,
    duplicate: false,
    triggeredAlert,
  };
}

/**
 * Update citizen safety status to SAFE ("Təhlükəsizəm").
 * - With `sosId`: closes that SOS, but only with its access token (ownership proof).
 * - With only `citizenCode`: records a standalone SafetyCheckIn and never touches
 *   existing SOS records (a citizen code is not a secret).
 * Returns `{ sos }` or `{ checkIn }`.
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
    return { sos: updated };
  }

  // Standalone SAFE check-in (no prior SOS from this device)
  const zones = await prisma.zone.findMany({ orderBy: { id: 'asc' } });
  let zone = zoneId ? zones.find((z) => z.id === Number(zoneId)) : null;
  if (!zone && lat !== undefined && lng !== undefined) {
    zone = findNearestZone(Number(lat), Number(lng), zones);
  }
  zone = zone || zones[0];
  if (!zone) throw notFound('ZONE_NOT_FOUND', 'No zones configured');

  const checkIn = await prisma.safetyCheckIn.create({
    data: {
      citizenCode,
      zoneId: zone.id,
      lat: lat !== undefined ? Number(lat) : zone.centerLat,
      lng: lng !== undefined ? Number(lng) : zone.centerLng,
    },
  });

  emitStateUpdated(io, { reason: 'CITIZEN_SAFE', checkInId: checkIn.id });
  return { checkIn };
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
