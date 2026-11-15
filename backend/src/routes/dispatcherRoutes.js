import { Router } from 'express';
import { z } from 'zod';
import { requireDispatcherAuth, requirePermission } from '../middleware/authMiddleware.js';
import {
  dismissCriticalAlert,
  executeCriticalAlert,
} from '../services/crisisEngineService.js';
import {
  getDispatcherDashboard,
  updateAssemblyPointOccupancy,
} from '../services/dispatcherService.js';
import { dispatchBrigadeToSos } from '../services/sosService.js';
import {
  asyncHandler,
  idParamSchema,
  validateBody,
  validateParams,
} from '../utils/http.js';

const router = Router();
router.use('/dispatcher', requireDispatcherAuth);

const occupancySchema = z.object({
  currentOccupancy: z.coerce.number().int().min(0).optional(),
  occupancyPercent: z.coerce.number().min(0).max(150).optional(),
  status: z.enum(['OPEN', 'STANDBY', 'FULL', 'CLOSED']).optional(),
});

const dispatchSosSchema = z.object({
  brigadeId: z.coerce.number().int().positive().optional(),
});

router.get(
  '/dispatcher/dashboard',
  requirePermission('dashboard:read'),
  asyncHandler(async (_req, res) => {
    const dashboard = await getDispatcherDashboard();
    res.json(dashboard);
  })
);

router.patch(
  '/dispatcher/shelters/:id/occupancy',
  requirePermission('shelters:update'),
  validateParams(idParamSchema),
  validateBody(occupancySchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await updateAssemblyPointOccupancy(
      req.validatedParams.id,
      req.validatedBody,
      io
    );
    res.json(result);
  })
);

router.post(
  '/dispatcher/sos/:id/dispatch',
  requirePermission('brigades:dispatch'),
  validateParams(idParamSchema),
  validateBody(dispatchSosSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await dispatchBrigadeToSos(
      req.validatedParams.id,
      req.validatedBody.brigadeId,
      io
    );
    res.json(result);
  })
);

router.post(
  '/dispatcher/alerts/:id/execute',
  requirePermission('alerts:execute'),
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await executeCriticalAlert(req.validatedParams.id, io, req.dispatcher);
    res.json(result);
  })
);

router.patch(
  '/dispatcher/alerts/:id/dismiss',
  requirePermission('alerts:dismiss'),
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const alert = await dismissCriticalAlert(req.validatedParams.id, io, req.dispatcher);
    res.json({ alert });
  })
);

export default router;
