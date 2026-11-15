import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireDispatcherAuth, requirePermission } from '../middleware/authMiddleware.js';
import { createSosLimiter } from '../middleware/rateLimits.js';
import { updateRoadStatus } from '../services/dispatcherService.js';
import { getEvacuationPlan } from '../services/evacuationService.js';
import { createSosSignal, markCitizenSafe } from '../services/sosService.js';
import {
  asyncHandler,
  idParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../utils/http.js';

const router = Router();

const createSosSchema = z.object({
  citizenCode: z.string().min(1).max(64).optional(),
  citizenName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  hazardType: z.enum(['FIRE', 'COLLAPSE', 'FLOOD', 'MEDICAL']),
  citizenCategory: z.enum(['STANDARD', 'SPECIAL_CARE']).optional(),
  // Set when the app found no reachable / step-free route: the citizen must be fetched
  needsTransport: z.boolean().optional(),
  zoneId: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  notes: z.string().max(400).optional(),
});

const safeStatusSchema = z
  .object({
    sosId: z.coerce.number().int().positive().optional(),
    accessToken: z.string().min(16).max(128).optional(),
    citizenCode: z.string().min(1).max(64).optional(),
    zoneId: z.coerce.number().int().positive().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((data) => data.sosId || data.citizenCode, {
    message: 'Either sosId or citizenCode must be provided',
  })
  .refine((data) => !data.sosId || data.accessToken, {
    message: 'accessToken is required to update an SOS',
    path: ['accessToken'],
  });

const evacuationPlanQuerySchema = z.object({
  zoneId: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  accessibleOnly: z.enum(['true', 'false']).optional(),
  citizenCategory: z.enum(['STANDARD', 'SPECIAL_CARE']).optional(),
});

const roadStatusSchema = z.object({
  status: z.enum(['OPEN', 'CONGESTED', 'CLOSED']),
  closureReason: z.string().max(250).optional(),
});

router.get(
  '/zones',
  asyncHandler(async (_req, res) => {
    const zones = await prisma.zone.findMany({ orderBy: { id: 'asc' } });
    res.json({ zones });
  })
);

router.get(
  '/citizen/evacuation-plan',
  validateQuery(evacuationPlanQuerySchema),
  asyncHandler(async (req, res) => {
    const { zoneId, lat, lng, accessibleOnly, citizenCategory } = req.validatedQuery;
    const plan = await getEvacuationPlan({
      zoneId,
      lat,
      lng,
      accessibleOnly,
      citizenCategory,
    });
    res.json(plan);
  })
);

router.post(
  '/citizen/sos',
  createSosLimiter(),
  validateBody(createSosSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await createSosSignal(req.validatedBody, io);
    // 201 = new emergency recorded; 200 = merged into the caller's existing SOS
    res.status(result.duplicate ? 200 : 201).json(result);
  })
);

router.patch(
  '/citizen/safe',
  validateBody(safeStatusSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await markCitizenSafe(req.validatedBody, io);
    res.json(result);
  })
);

// Simulated external traffic & road-network status endpoints
router.get(
  '/traffic/roads',
  asyncHandler(async (_req, res) => {
    const roads = await prisma.roadSegment.findMany({
      include: { zone: true, fromNode: true, toNode: true },
      orderBy: { id: 'asc' },
    });
    res.json({ roads });
  })
);

router.patch(
  '/traffic/roads/:id/status',
  requireDispatcherAuth,
  requirePermission('roads:update'),
  validateParams(idParamSchema),
  validateBody(roadStatusSchema),
  asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const updated = await updateRoadStatus(req.validatedParams.id, req.validatedBody, io);
    res.json({ road: updated });
  })
);

export default router;
