export const CRISIS_THRESHOLDS = {
  REROUTE_OCCUPANCY_PERCENT: 90,
  CRITICAL_OCCUPANCY_PERCENT: 95,
  SOS_CLUSTER_MIN_COUNT: 4,
  SOS_CLUSTER_RADIUS_METERS: 500,
  SOS_CLUSTER_WINDOW_MINUTES: 5,
  CONGESTED_ROAD_PENALTY: 1.6,
};

export const PORT = Number(process.env.PORT || 4000);
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

/**
 * Parse the comma-separated FRONTEND_ORIGIN allow-list.
 * A wildcard is ignored on purpose: with `credentials: true` it would let any
 * website make authenticated requests on behalf of a logged-in dispatcher.
 */
export function parseAllowedOrigins(raw) {
  const list = String(raw || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');
  return list.length > 0 ? list : DEFAULT_ALLOWED_ORIGINS;
}

export const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.FRONTEND_ORIGIN);
export const AUTH_COOKIE_NAME = 'crisis_dispatcher_token';
export const JWT_EXPIRES_IN = '8h';
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable must be set in production');
      })()
    : 'dev-urban-crisis-jwt-secret-key-2026');

/**
 * External Map & Routing API + resilience settings (Challenge Drop #2).
 * TIMEOUT_MS = 5000: the task defines "> 5 s response time" as a failure.
 */
export const ROUTING_CONFIG = {
  API_URL: process.env.ROUTING_API_URL || 'http://localhost:4100',
  CONTROL_TOKEN: process.env.ROUTING_API_CONTROL_TOKEN || 'dev-routing-control-token',
  TIMEOUT_MS: Number(process.env.ROUTING_API_TIMEOUT_MS || 5000),
  FAILURE_THRESHOLD: Number(process.env.ROUTING_CB_FAILURE_THRESHOLD || 3),
  OPEN_DURATION_MS: Number(process.env.ROUTING_CB_OPEN_MS || 20000),
  HEALTH_PROBE_MS: Number(process.env.ROUTING_HEALTH_PROBE_MS || 5000),
};

/**
 * SOS flood protection (Challenge Drop #3).
 * DUPLICATE_WINDOW_SECONDS: same citizen + same hazard within this window is the
 * same emergency → merged into the existing SOS instead of a new record.
 */
export const SOS_FLOOD_CONFIG = {
  DUPLICATE_WINDOW_SECONDS: Number(process.env.SOS_DUPLICATE_WINDOW_SECONDS || 120),
  ZONE_CACHE_TTL_MS: Number(process.env.ZONE_CACHE_TTL_MS || 30000),
  PUBLIC_EVENT_THROTTLE_MS: Number(process.env.PUBLIC_EVENT_THROTTLE_MS || 500),
  // How long an SOS response may wait for the crisis evaluation. Past this the
  // SOS is acknowledged and the Red Alert is delivered to dispatchers over
  // Socket.IO when the (coalesced) evaluation finishes. Keeps latency bounded.
  EVALUATION_BUDGET_MS: Number(process.env.SOS_EVALUATION_BUDGET_MS || 30),
};
