import 'dotenv/config';
import { ROUTING_CONFIG } from '../config/constants.js';
import { prisma } from '../config/db.js';
import { createMockRoutingApi } from './mockRoutingApi.js';

/**
 * Standalone process for the simulated external routing provider.
 * Run: `npm run routing-api` (local) or the `routing-api` docker compose service.
 */
const port = Number(process.env.ROUTING_API_PORT || 4100);

const { app } = createMockRoutingApi({
  controlToken: ROUTING_CONFIG.CONTROL_TOKEN,
  initialMode: (process.env.ROUTING_API_INITIAL_MODE || 'HEALTHY').toUpperCase(),
  slowDelayMs: Number(process.env.ROUTING_API_SLOW_DELAY_MS || 7000),
  loadGraph: async () => {
    const [nodes, roads] = await Promise.all([
      prisma.roadNode.findMany(),
      prisma.roadSegment.findMany({ orderBy: { id: 'asc' } }),
    ]);
    return { nodes, roads };
  },
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Simulated external Map & Routing API listening on port ${port}`);
});
