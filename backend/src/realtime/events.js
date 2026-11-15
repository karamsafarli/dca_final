import { SOS_FLOOD_CONFIG } from '../config/constants.js';

/**
 * Central catalogue of Socket.IO rooms and events.
 *
 * Privacy rule: full SOS records (name, phone, exact location, notes) go ONLY to
 * the authenticated `dispatchers` room. A citizen receives a minimal status view
 * of their own SOS in a private room they can join only with the SOS access token.
 * Public broadcasts carry ids and reasons, never personal data.
 */
export const DISPATCHER_ROOM = 'dispatchers';
export const citizenSosRoom = (sosId) => `sos:${sosId}`;

/** PII-free projection of an SOS for its owner. */
export function toCitizenSosView(sos) {
  return {
    id: sos.id,
    status: sos.status,
    citizenStatus: sos.citizenStatus,
    hazardType: sos.hazardType,
    priorityLevel: sos.priorityLevel,
    citizenCategory: sos.citizenCategory,
    zoneId: sos.zoneId,
    assignedBrigade: sos.assignedBrigade
      ? { name: sos.assignedBrigade.name, unitType: sos.assignedBrigade.unitType }
      : null,
    updatedAt: sos.updatedAt,
  };
}

/** Public, PII-free "something changed, refetch what you need" signal. */
export function emitStateUpdated(io, payload) {
  io?.emit('state:updated', payload);
}

/**
 * Public "SOS created" notifications are batched: during a flood every
 * connected citizen would otherwise receive hundreds of events per second.
 * Dispatchers still get each `sos:created` in their private room.
 */
const publicBatches = new WeakMap(); // io -> { count, timer }

function emitBatchedSosCreated(io) {
  if (!io) return;
  let batch = publicBatches.get(io);
  if (!batch) {
    batch = { count: 0, timer: null };
    publicBatches.set(io, batch);
  }
  batch.count += 1;
  if (batch.timer) return;
  batch.timer = setTimeout(() => {
    const count = batch.count;
    batch.count = 0;
    batch.timer = null;
    emitStateUpdated(io, { reason: 'SOS_CREATED', count });
  }, SOS_FLOOD_CONFIG.PUBLIC_EVENT_THROTTLE_MS);
  batch.timer.unref?.();
}

export function emitSosCreated(io, sos) {
  io?.to(DISPATCHER_ROOM).emit('sos:created', sos);
  emitBatchedSosCreated(io);
}

export function emitSosUpdated(io, sos, reason) {
  if (!io) return;
  io.to(DISPATCHER_ROOM).emit('sos:updated', sos);
  io.to(citizenSosRoom(sos.id)).emit('sos:status', toCitizenSosView(sos));
  emitStateUpdated(io, { reason, sosId: sos.id });
}

export function emitAlertCreated(io, alert, reason) {
  io?.to(DISPATCHER_ROOM).emit('alert:created', alert);
  emitStateUpdated(io, { reason, zoneId: alert.zoneId, alertId: alert.id });
}

export function emitAlertResolved(io, result, reason) {
  io?.to(DISPATCHER_ROOM).emit('alert:executed', result);
  emitStateUpdated(io, { reason, alertId: result.alert?.id ?? result.id });
}

/** Routing provider health (no PII): drives the citizen "offline mode" banner. */
export function emitRoutingStatus(io, status) {
  if (!io) return;
  io.emit('routing:status', status);
  emitStateUpdated(io, { reason: 'ROUTING_MODE_CHANGED', mode: status.mode });
}
