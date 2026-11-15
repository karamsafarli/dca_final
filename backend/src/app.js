import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { FRONTEND_ORIGIN } from './config/constants.js';
import { prisma } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import citizenRoutes from './routes/citizenRoutes.js';
import dispatcherRoutes from './routes/dispatcherRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN.split(','),
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', service: 'urban-crisis-engine', node: process.version });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', authRoutes);
  app.use('/api', citizenRoutes);
  app.use('/api', dispatcherRoutes);
  app.use('/api', simulationRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) {
      console.error('Unhandled backend error:', err);
    }
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}
