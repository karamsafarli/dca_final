/**
 * Which realtime events can change a citizen's evacuation plan.
 * SOS created / dispatched / safe confirmations do NOT change routes, so they
 * must not make every citizen in the city refetch (thundering herd).
 */
export const PLAN_AFFECTING_REASONS = new Set([
  'ROAD_STATUS_CHANGED',
  'OCCUPANCY_CHANGED',
  'CAPACITY_OVERFLOW',
  'ALERT_EXECUTED', // a reserve assembly point was opened
  'ROUTING_MODE_CHANGED', // external routing API went down / recovered
  'SYSTEM_RESET',
]);

export function shouldRefetchPlan(reason) {
  return PLAN_AFFECTING_REASONS.has(reason);
}

/**
 * Did the guidance the citizen should follow actually change?
 * Compares destination, route geometry and the reroute reasons.
 */
export function didRouteChange(prevPlan, nextPlan) {
  if (!prevPlan || !nextPlan) return false;
  const prev = prevPlan.recommendedPoint;
  const next = nextPlan.recommendedPoint;
  if ((prev?.id ?? null) !== (next?.id ?? null)) return true;
  if (prevPlan.assistanceRequired !== nextPlan.assistanceRequired) return true;
  const prevPath = JSON.stringify(prev?.route?.polyline ?? []);
  const nextPath = JSON.stringify(next?.route?.polyline ?? []);
  if (prevPath !== nextPath) return true;
  const reasons = (p) => [...(p.rerouteReasons ?? [])].sort().join(',');
  return reasons(prevPlan) !== reasons(nextPlan);
}
