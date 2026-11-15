import { Router } from 'express';
import { z } from 'zod';
import { requireDispatcherAuth, requirePermission } from '../middleware/authMiddleware.js';
import {
  resetSystemSimulation,
  simulateOccupancySpike,
  simulateRoadToggle,
  setRoutingApiSimulationMode,
  simulateSosBurst,
} from '../services/simulationService.js';
import { asyncHandler, validateBody } from '../utils/http.js';

const router = Router();
router.use('/simulation', requireDispatcherAuth, requirePermission('simulation:run'));

const sosBurstSchema = z.object({
  zoneId: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  hazardType: z.enum(['FIRE', 'COLLAPSE', 'FLOOD', 'MEDICAL']).optional(),
});

const roadToggleSchema = z.object({
  roadId: z.coerce.number().int().positive().optional(),
  roadCode: z.string().optional(),
  zoneId: z.coerce.number().int().positive().optional(),
  status: z.enum(['OPEN', 'CONGESTED', 'CLOSED']).optional(),
  closureReason: z.string().optional(),
});

const occupancySpikeSchema = z.object({
  assemblyPointId: z.coerce.number().int().positive().optional(),
  targetPercent: z.coerce.number().min(0).max(120).optional(),
});

router.post(
  '/simulation/sos-burst',
  validateBody(sosBurstSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await simulateSosBurst(req.validatedBody, io);
    res.status(201).json(result);
  })
);

router.post(
  '/simulation/road-toggle',
  validateBody(roadToggleSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const road = await simulateRoadToggle(req.validatedBody, io);
    res.json({ road });
  })
);

router.post(
  '/simulation/occupancy-spike',
  validateBody(occupancySpikeSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await simulateOccupancySpike(req.validatedBody, io);
    res.json(result);
  })
);

const routingApiModeSchema = z.object({
  mode: z.enum(['HEALTHY', 'DOWN', 'SLOW']),
});

router.post(
  '/simulation/routing-api',
  validateBody(routingApiModeSchema),
  asyncHandler(async (req, res) => {
    const routing = await setRoutingApiSimulationMode(req.validatedBody.mode);
    res.json({ mode: req.validatedBody.mode, routing });
  })
);

router.post(
  '/simulation/reset',
  requirePermission('system:reset'),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await resetSystemSimulation(io);
    res.json(result);
  })
);

export default router;
