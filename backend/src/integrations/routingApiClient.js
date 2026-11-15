import { z } from 'zod';

/**
 * HTTP client for the external Map & Routing API (simulated in this project by
 * `src/external/routingApiServer.js`). It knows nothing about resilience: the
 * routing gateway wraps every call in a circuit breaker with a 5 s timeout.
 */

export class ExternalServiceError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = 'ExternalServiceError';
    this.code = code;
    this.status = status;
  }
}

const roadRefSchema = z
  .object({ id: z.number(), code: z.string().optional(), name: z.string() })
  .passthrough();

const routeSchema = z.object({
  destinationId: z.number(),
  reachable: z.boolean(),
  distanceMeters: z.number().nullable(),
  weightedCost: z.number().nullable(),
  estimatedMinutes: z.number().nullable(),
  polyline: z.array(z.tuple([z.number(), z.number()])),
  roadIdsUsed: z.array(z.number()),
  roadNamesUsed: z.array(z.string()),
  closedRoadsEncountered: z.array(roadRefSchema),
  nonAccessibleRoadsEncountered: z.array(roadRefSchema),
  hasCongestion: z.boolean(),
});

const routeMatrixResponseSchema = z.object({
  provider: z.string(),
  routes: z.array(routeSchema),
});

/** JSON has no Infinity: unreachable routes come back with nulls. */
function toInternalRoute({ destinationId, ...route }) {
  return {
    ...route,
    distanceMeters: route.reachable ? route.distanceMeters : Infinity,
    weightedCost: route.reachable ? route.weightedCost : Infinity,
  };
}

export function createRoutingApiClient({ baseUrl, controlToken, fetchImpl = globalThis.fetch }) {
  async function request(path, { method = 'GET', body, signal, headers = {} } = {}) {
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        signal,
        headers: { 'content-type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      throw new ExternalServiceError('EXTERNAL_UNREACHABLE', `Routing API unreachable: ${err.message}`);
    }

    if (!res.ok) {
      throw new ExternalServiceError(
        res.status === 503 ? 'EXTERNAL_UNAVAILABLE' : 'EXTERNAL_ERROR',
        `Routing API responded HTTP ${res.status}`,
        res.status
      );
    }

    try {
      return await res.json();
    } catch {
      throw new ExternalServiceError('INVALID_RESPONSE', 'Routing API returned invalid JSON');
    }
  }

  return {
    baseUrl,

    /** Batch route computation: one origin, many destinations. Returns Map<destinationId, route>. */
    async routeMatrix({ origin, destinations, profile, avoidClosedRoads }, signal) {
      const json = await request('/v1/route-matrix', {
        method: 'POST',
        signal,
        body: { origin, destinations, profile, avoidClosedRoads },
      });
      const parsed = routeMatrixResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new ExternalServiceError('INVALID_RESPONSE', 'Routing API response failed schema validation');
      }
      return new Map(parsed.data.routes.map((r) => [r.destinationId, toInternalRoute(r)]));
    },

    async health(signal) {
      return request('/health', { signal });
    },

    /** Demo control of the simulated provider's fault mode. */
    async setSimulationMode(mode) {
      return request('/__simulate', {
        method: 'POST',
        body: { mode },
        headers: { 'x-control-token': controlToken },
        signal: AbortSignal.timeout(3000),
      });
    },
  };
}
