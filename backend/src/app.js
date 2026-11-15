import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { ALLOWED_ORIGINS } from './config/constants.js';
import { prisma } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import citizenRoutes from './routes/citizenRoutes.js';
import dispatcherRoutes from './routes/dispatcherRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import { getRoutingGateway } from './services/routingGateway.js';
import { latencyMetrics, latencySnapshot } from './middleware/latencyMetrics.js';
import { requireDispatcherAuth, requirePermission } from './middleware/authMiddleware.js';

export function createApp() {
  const app = express();
  // Behind nginx / the Vite proxy: use the real client IP for rate limiting
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(latencyMetrics());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else if (process.env.NODE_ENV !== 'test') {
    // Production: log problems only. Logging every request synchronously to
    // stdout costs real latency during an SOS flood; 429s are counted in metrics.
    app.use(morgan('combined', { skip: (_req, res) => res.statusCode < 400 || res.statusCode === 429 }));
  }

  app.get('/api/health', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const routing = getRoutingGateway().getStatus();
      // A dead routing provider degrades the service, it does not take it down.
      res.json({
        status: routing.degraded ? 'degraded' : 'ok',
        service: 'urban-crisis-engine',
        dependencies: { database: 'ok', routingApi: routing.circuit.state },
      });
    } catch (err) {
      next(err);
    }
  });

  // Live latency per route (Challenge Drop #3), for the dispatcher console
  app.get('/api/metrics/latency', requireDispatcherAuth, requirePermission('dashboard:read'), (_req, res) => {
    res.json(latencySnapshot());
  });

  app.get('/api/routing/status', (_req, res) => {
    res.json(getRoutingGateway().getStatus());
  });

  app.use('/api', authRoutes);
  app.use('/api', citizenRoutes);
  app.use('/api', dispatcherRoutes);
  app.use('/api', simulationRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // Prisma "record not found" on update/delete
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
    }
    const status = err.statusCode || 500;
    if (status >= 500) {
      console.error('Unhandled backend error:', err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
    return res.status(status).json({
      error: err.message,
      code: err.code || 'ERROR',
      ...(err.details ? { details: err.details } : {}),
    });
  });

  return app;
}
