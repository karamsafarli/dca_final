import { prisma } from '../config/db.js';
import { seedDatabase } from '../db/seedData.js';
import { updateAssemblyPointOccupancy, updateRoadStatus } from './dispatcherService.js';
import { AppError, notFound } from '../utils/errors.js';
import { getEvacuationPlan } from './evacuationService.js';
import { getRoutingGateway } from './routingGateway.js';
import { createSosSignal } from './sosService.js';

/**
 * Simulate 4 distinct citizen SOS signals within a 500m radius in rapid succession.
 */
export async function simulateSosBurst({ zoneId, lat, lng, hazardType }, io) {
  let zone = null;
  if (zoneId) {
    zone = await prisma.zone.findUnique({ where: { id: Number(zoneId) } });
  }
  if (!zone) {
    zone = await prisma.zone.findFirst({ orderBy: { id: 'asc' } });
  }

  const baseLat = lat !== undefined ? Number(lat) : zone.centerLat;
  const baseLng = lng !== undefined ? Number(lng) : zone.centerLng;
  const hazards = ['COLLAPSE', 'FIRE', 'MEDICAL', 'FLOOD'];

  // Offsets ~80m to ~240m around center (well within 500m radius)
  const offsets = [
    [0.0007, 0.0005, 'Aynur Quliyeva'],
    [-0.0009, 0.0008, 'Orxan Həsənov'],
    [0.0011, -0.0007, 'Nigar Vəliyeva'],
    [-0.0006, -0.001, 'Kamran Əhmədov'],
  ];

  const createdSignals = [];
  let triggeredAlert = null;

  for (let i = 0; i < offsets.length; i += 1) {
    const [dLat, dLng, name] = offsets[i];
    const result = await createSosSignal(
      {
        citizenCode: `CIT-SIM-${Date.now().toString(36).toUpperCase()}-${i + 1}`,
        citizenName: name,
        hazardType: hazardType || hazards[i % hazards.length],
        zoneId: zone.id,
        lat: Number((baseLat + dLat).toFixed(6)),
        lng: Number((baseLng + dLng).toFixed(6)),
        notes: 'Simulyasiya: Zona daxilində kütləvi SOS siqnalı',
      },
      io
    );
    createdSignals.push(result.sos);
    if (result.triggeredAlert) {
      triggeredAlert = result.triggeredAlert;
    }
  }

  return {
    zone,
    createdCount: createdSignals.length,
    signals: createdSignals,
    triggeredAlert,
  };
}

/**
 * Simulate closing or reopening a road segment to demonstrate live rerouting.
 */
export async function simulateRoadToggle(
  { roadId, roadCode, zoneId, status = 'CLOSED', closureReason },
  io
) {
  let road = null;
  if (roadId) {
    road = await prisma.roadSegment.findUnique({ where: { id: Number(roadId) } });
  } else if (roadCode) {
    road = await prisma.roadSegment.findUnique({ where: { code: roadCode } });
  } else {
    const plan = await getEvacuationPlan({ zoneId });
    const activeRouteRoadId = plan.recommendedPoint?.route?.roadIdsUsed?.[0];
    if (activeRouteRoadId) {
      road = await prisma.roadSegment.findUnique({ where: { id: activeRouteRoadId } });
    }
    if (!road) {
      road = await prisma.roadSegment.findFirst({
        where: {
          status: 'OPEN',
          ...(zoneId ? { zoneId: Number(zoneId) } : {}),
        },
        orderBy: { id: 'asc' },
      });
    }
  }

  if (!road) {
    throw notFound('ROAD_NOT_FOUND', 'Road segment not found');
  }

  return updateRoadStatus(
    road.id,
    {
      status,
      closureReason:
        closureReason || 'Simulyasiya: Zəlzələ nəticəsində yol zədələnib və bağlanıb',
    },
    io
  );
}

/**
 * Simulate occupancy spike on an assembly point (e.g., 92% or 97%).
 */
export async function simulateOccupancySpike(
  { assemblyPointId, targetPercent = 96 },
  io
) {
  let point = null;
  if (assemblyPointId) {
    point = await prisma.assemblyPoint.findUnique({
      where: { id: Number(assemblyPointId) },
    });
  } else {
    point = await prisma.assemblyPoint.findFirst({
      where: { status: 'OPEN' },
      orderBy: { id: 'asc' },
    });
  }

  if (!point) {
    throw notFound('ASSEMBLY_POINT_NOT_FOUND', 'Open assembly point not found');
  }

  return updateAssemblyPointOccupancy(
    point.id,
    { occupancyPercent: Number(targetPercent) },
    io
  );
}

/**
 * Reset database back to clean Baku seed state.
 */
export async function resetSystemSimulation(io) {
  await seedDatabase(prisma);
  const gateway = getRoutingGateway();
  await gateway.client.setSimulationMode('HEALTHY').catch(() => {});
  gateway.reset();
  if (io) {
    io.emit('state:updated', { reason: 'SYSTEM_RESET' });
  }
  return { reset: true };
}

/**
 * Challenge Drop #2 demo: switch the simulated external routing API into a
 * fault mode (DOWN = HTTP 503, SLOW = > 5 s) or back to HEALTHY.
 */
export async function setRoutingApiSimulationMode(mode) {
  const gateway = getRoutingGateway();
  try {
    await gateway.client.setSimulationMode(mode);
  } catch (err) {
    throw new AppError(
      502,
      'ROUTING_API_CONTROL_FAILED',
      `Could not reach the simulated routing API control endpoint: ${err.message}`
    );
  }
  if (mode === 'HEALTHY') {
    // Do not wait for the next probe: close the circuit so citizens go back online now.
    gateway.reset();
  }
  return gateway.getStatus();
}
