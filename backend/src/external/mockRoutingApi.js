import express from 'express';
import { z } from 'zod';
import { computeShortestPath } from '../services/routingService.js';

/**
 * SIMULATED external Map & Routing API.
 *
 * Stands in for a third-party provider (OSRM / Google / HERE). It runs as its
 * own process / container, so the backend talks to it over real HTTP and its
 * failures are real network failures. Fault modes for the demo:
 *   HEALTHY      normal responses
 *   DOWN         HTTP 503 Service Unavailable
 *   SLOW         responds only after `slowDelayMs` (default 7 s > 5 s timeout)
 */
export const SIMULATION_MODES = ['HEALTHY', 'DOWN', 'SLOW'];

const requestSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destinations: z
    .array(
      z.object({
        id: z.number(),
        lat: z.number(),
        lng: z.number(),
        nodeId: z.number().nullable().optional(),
      })
    )
    .max(200),
  profile: z.enum(['foot', 'wheelchair']).default('foot'),
  avoidClosedRoads: z.boolean().default(true),
});

const finiteOrNull = (n) => (Number.isFinite(n) ? n : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createMockRoutingApi({
  loadGraph,
  controlToken,
  initialMode = 'HEALTHY',
  slowDelayMs = 7000,
}) {
  const state = { mode: initialMode, slowDelayMs, requests: 0 };
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Control plane (never faulted)
  app.get('/__simulate', (_req, res) => res.json({ mode: state.mode }));
  app.post('/__simulate', (req, res) => {
    if (req.get('x-control-token') !== controlToken) {
      return res.status(401).json({ error: 'invalid control token' });
    }
    const mode = String(req.body?.mode || '').toUpperCase();
    if (!SIMULATION_MODES.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of ${SIMULATION_MODES.join(', ')}` });
    }
    state.mode = mode;
    return res.json({ mode });
  });

  // Fault injection for the data plane
  app.use(async (_req, res, next) => {
    state.requests += 1;
    if (state.mode === 'DOWN') {
      return res.status(503).json({ error: 'Service Unavailable' });
    }
    if (state.mode === 'SLOW') {
      await sleep(state.slowDelayMs);
      if (res.headersSent || res.destroyed) return undefined;
    }
    return next();
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', mode: state.mode }));

  app.post('/v1/route-matrix', async (req, res, next) => {
    try {
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid request', details: parsed.error.flatten() });
      }
      const { origin, destinations, profile, avoidClosedRoads } = parsed.data;
      const { nodes, roads } = await loadGraph();

      const routes = destinations.map((dest) => {
        const r = computeShortestPath(origin, dest, nodes, roads, {
          ignoreClosures: !avoidClosedRoads,
          accessibleOnly: profile === 'wheelchair',
        });
        return {
          destinationId: dest.id,
          reachable: r.reachable,
          distanceMeters: finiteOrNull(r.distanceMeters),
          weightedCost: finiteOrNull(r.weightedCost),
          estimatedMinutes: r.estimatedMinutes,
          polyline: r.polyline,
          roadIdsUsed: r.roadIdsUsed,
          roadNamesUsed: r.roadNamesUsed,
          closedRoadsEncountered: r.closedRoadsEncountered,
          nonAccessibleRoadsEncountered: r.nonAccessibleRoadsEncountered,
          hasCongestion: r.hasCongestion,
        };
      });

      return res.json({ provider: 'simulated-external-routing-api', routes });
    } catch (err) {
      return next(err);
    }
  });

  return { app, state };
}
