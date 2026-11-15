import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireDispatcherAuth } from '../middleware/authMiddleware.js';
import { executeCriticalAlert } from '../services/crisisEngineService.js';
import {
  getDispatcherDashboard,
  updateAssemblyPointOccupancy,
} from '../services/dispatcherService.js';
import { dispatchBrigadeToSos } from '../services/sosService.js';
import { asyncHandler, validateBody } from '../utils/http.js';

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
  asyncHandler(async (_req, res) => {
    const dashboard = await getDispatcherDashboard();
    res.json(dashboard);
  })
);

router.patch(
  '/dispatcher/shelters/:id/occupancy',
  validateBody(occupancySchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await updateAssemblyPointOccupancy(
      req.params.id,
      req.validatedBody,
      io
    );
    res.json(result);
  })
);

router.post(
  '/dispatcher/sos/:id/dispatch',
  validateBody(dispatchSosSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await dispatchBrigadeToSos(
      req.params.id,
      req.validatedBody.brigadeId,
      io
    );
    res.json(result);
  })
);

router.post(
  '/dispatcher/alerts/:id/execute',
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await executeCriticalAlert(req.params.id, io, req.dispatcher);
    res.json(result);
  })
);

router.patch(
  '/dispatcher/alerts/:id/dismiss',
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const alert = await prisma.criticalAlert.update({
      where: { id: Number(req.params.id) },
      data: { status: 'DISMISSED' },
      include: { zone: true, assemblyPoint: true },
    });
    if (io) {
      io.emit('state:updated', { reason: 'ALERT_DISMISSED', alertId: alert.id });
    }
    res.json({ alert });
  })
);

export default router;
