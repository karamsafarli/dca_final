import { EventEmitter } from 'node:events';
import { ROUTING_CONFIG } from '../config/constants.js';
import { createRoutingApiClient } from '../integrations/routingApiClient.js';
import { CircuitBreaker, CircuitState } from '../resilience/circuitBreaker.js';
import { RouteCache, routeCacheKey } from '../resilience/routeCache.js';
import { computeLocalRouteSets } from './routingService.js';

export const RoutingMode = Object.freeze({
  ONLINE: 'ONLINE', // external Map & Routing API
  FALLBACK_CACHE: 'FALLBACK_CACHE', // last cached external routes, same road state
  FALLBACK_LOCAL_GRAPH: 'FALLBACK_LOCAL_GRAPH', // Dijkstra over our local backup road graph
  FALLBACK_STRAIGHT_LINE: 'FALLBACK_STRAIGHT_LINE', // static coordinate matrix (haversine)
});

const PROVIDER_BY_MODE = {
  ONLINE: 'external-routing-api',
  FALLBACK_CACHE: 'local-route-cache',
  FALLBACK_LOCAL_GRAPH: 'local-road-graph',
  FALLBACK_STRAIGHT_LINE: 'local-coordinate-matrix',
};

/** Map any failure to a stable reason code the UI can translate. */
export function failureReason(err) {
  if (err?.code === 'CIRCUIT_OPEN') return 'CIRCUIT_OPEN';
  if (err?.code === 'TIMEOUT' || err?.name === 'AbortError') return 'EXTERNAL_TIMEOUT';
  if (err?.code === 'EXTERNAL_UNAVAILABLE') return 'EXTERNAL_UNAVAILABLE';
  if (err?.code === 'EXTERNAL_UNREACHABLE') return 'EXTERNAL_UNREACHABLE';
  if (err?.code === 'INVALID_RESPONSE') return 'INVALID_RESPONSE';
  return 'EXTERNAL_ERROR';
}

/**
 * Single entry point for route calculations (Challenge Drop #2).
 * Never throws: on any external failure it falls back, in order, to
 *   1. cached external routes for the identical origin/destinations/road state,
 *   2. the local road graph (Dijkstra on our own DB),
 *   3. straight-line distances (static coordinate matrix) if no graph exists,
 * and labels the result so the citizen sees "Offline / backup route mode".
 *
 * Emits `status` whenever the circuit changes state or the serving mode changes.
 */
export class RoutingGateway extends EventEmitter {
  constructor({ client, breaker, cache = new RouteCache() }) {
    super();
    this.client = client;
    this.breaker = breaker;
    this.cache = cache;
    this.lastMode = RoutingMode.ONLINE;
    this.lastReason = null;
    this.lastModeAt = new Date().toISOString();
    this.probeTimer = null;

    this.breaker.on('stateChange', (change) => {
      if (change.to === CircuitState.CLOSED) this.#setMode(RoutingMode.ONLINE, null);
      this.emit('status', this.getStatus());
    });
  }

  #setMode(mode, reason) {
    const changed = mode !== this.lastMode || reason !== this.lastReason;
    this.lastMode = mode;
    this.lastReason = reason;
    if (changed) {
      this.lastModeAt = new Date().toISOString();
      this.emit('status', this.getStatus());
    }
  }

  getStatus() {
    return {
      mode: this.lastMode,
      degraded: this.lastMode !== RoutingMode.ONLINE,
      reason: this.lastReason,
      provider: PROVIDER_BY_MODE[this.lastMode],
      since: this.lastModeAt,
      circuit: this.breaker.snapshot(),
      cachedRouteSets: this.cache.size,
    };
  }

  #describe(mode, reason, extra = {}) {
    return {
      mode,
      degraded: mode !== RoutingMode.ONLINE,
      reason,
      provider: PROVIDER_BY_MODE[mode],
      circuitState: this.breaker.state,
      ...extra,
    };
  }

  /**
   * Resolve ideal + live route sets for every destination.
   * @returns {{ ideal: Map, live: Map, routing: object }}
   */
  async resolveRouteSets({ origin, points, accessibleOnly = false, nodes, roads }) {
    const destinations = points.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      nodeId: p.nodeId ?? null,
    }));
    const key = routeCacheKey({ origin, destinations, accessibleOnly, roads });

    if (destinations.length === 0) {
      return { ideal: new Map(), live: new Map(), routing: this.#describe(this.lastMode, this.lastReason) };
    }

    try {
      const [ideal, live] = await this.breaker.execute((signal) =>
        Promise.all([
          this.client.routeMatrix(
            { origin, destinations, profile: 'foot', avoidClosedRoads: false },
            signal
          ),
          this.client.routeMatrix(
            {
              origin,
              destinations,
              profile: accessibleOnly ? 'wheelchair' : 'foot',
              avoidClosedRoads: true,
            },
            signal
          ),
        ])
      );
      this.cache.set(key, { ideal, live });
      this.#setMode(RoutingMode.ONLINE, null);
      return { ideal, live, routing: this.#describe(RoutingMode.ONLINE, null) };
    } catch (err) {
      const reason = failureReason(err);

      const cached = this.cache.get(key);
      if (cached) {
        this.#setMode(RoutingMode.FALLBACK_CACHE, reason);
        return {
          ...cached.value,
          routing: this.#describe(RoutingMode.FALLBACK_CACHE, reason, {
            cachedAt: new Date(cached.storedAt).toISOString(),
          }),
        };
      }

      const mode = nodes.length > 0 ? RoutingMode.FALLBACK_LOCAL_GRAPH : RoutingMode.FALLBACK_STRAIGHT_LINE;
      const local = computeLocalRouteSets(origin, points, nodes, roads, { accessibleOnly });
      this.#setMode(mode, reason);
      return { ...local, routing: this.#describe(mode, reason) };
    }
  }

  /**
   * While degraded, periodically probe the provider's /health through the
   * breaker so the system returns ONLINE automatically, even without traffic.
   */
  startHealthProbe(intervalMs = ROUTING_CONFIG.HEALTH_PROBE_MS) {
    this.stopHealthProbe();
    this.probeTimer = setInterval(() => {
      if (this.breaker.state === CircuitState.CLOSED && this.lastMode === RoutingMode.ONLINE) return;
      this.breaker
        .execute((signal) => this.client.health(signal))
        .then(() => this.#setMode(RoutingMode.ONLINE, null))
        .catch(() => {});
    }, intervalMs);
    this.probeTimer.unref?.();
  }

  stopHealthProbe() {
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = null;
  }

  /** Demo reset: close the circuit and forget cached routes. */
  reset() {
    this.cache.clear();
    this.breaker.reset();
    this.#setMode(RoutingMode.ONLINE, null);
  }
}

export function createRoutingGateway(config = ROUTING_CONFIG) {
  return new RoutingGateway({
    client: createRoutingApiClient({
      baseUrl: config.API_URL,
      controlToken: config.CONTROL_TOKEN,
    }),
    breaker: new CircuitBreaker({
      name: 'external-routing-api',
      timeoutMs: config.TIMEOUT_MS,
      failureThreshold: config.FAILURE_THRESHOLD,
      openDurationMs: config.OPEN_DURATION_MS,
    }),
  });
}

let gatewayInstance = null;

export function getRoutingGateway() {
  if (!gatewayInstance) gatewayInstance = createRoutingGateway();
  return gatewayInstance;
}

/** Test hook: swap the process-wide gateway. */
export function setRoutingGateway(gateway) {
  gatewayInstance = gateway;
}
