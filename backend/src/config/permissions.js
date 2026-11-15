/**
 * Role-based access control (Challenge Drop #3).
 *
 * OBSERVER    read-only situational awareness (e.g. city officials, analysts)
 * DISPATCHER  operates the response: dispatch brigades, execute Red Alerts,
 *             change road / shelter state, run demo scenarios
 * COMMANDER   everything a dispatcher can do + destructive system actions
 *
 * The role is re-read from the database on every request (never trusted from
 * the JWT), so demoting or deactivating an account takes effect immediately.
 */
const DISPATCHER_PERMISSIONS = [
  'dashboard:read',
  'brigades:dispatch',
  'alerts:execute',
  'alerts:dismiss',
  'roads:update',
  'shelters:update',
  'simulation:run',
];

export const ROLE_PERMISSIONS = Object.freeze({
  OBSERVER: Object.freeze(['dashboard:read']),
  DISPATCHER: Object.freeze(DISPATCHER_PERMISSIONS),
  COMMANDER: Object.freeze([...DISPATCHER_PERMISSIONS, 'system:reset']),
});

export function permissionsFor(role) {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function can(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
