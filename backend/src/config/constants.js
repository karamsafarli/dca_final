export const CRISIS_THRESHOLDS = {
  REROUTE_OCCUPANCY_PERCENT: 90,
  CRITICAL_OCCUPANCY_PERCENT: 95,
  SOS_CLUSTER_MIN_COUNT: 4,
  SOS_CLUSTER_RADIUS_METERS: 500,
  SOS_CLUSTER_WINDOW_MINUTES: 5,
  CONGESTED_ROAD_PENALTY: 1.6,
};

export const PORT = Number(process.env.PORT || 4000);
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
export const AUTH_COOKIE_NAME = 'crisis_dispatcher_token';
export const JWT_EXPIRES_IN = '8h';
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable must be set in production');
      })()
    : 'dev-urban-crisis-jwt-secret-key-2026');
