import { describe, expect, it } from 'vitest';
import { didRouteChange, shouldRefetchPlan } from './planUpdates';

const plan = (id, polyline = [[1, 1], [2, 2]], rerouteReasons = []) => ({
  recommendedPoint: id ? { id, route: { polyline } } : null,
  rerouteReasons,
  assistanceRequired: id ? null : 'NO_REACHABLE_POINT',
});

describe('shouldRefetchPlan', () => {
  it('refetches only for events that can change routes', () => {
    expect(shouldRefetchPlan('ROAD_STATUS_CHANGED')).toBe(true);
    expect(shouldRefetchPlan('OCCUPANCY_CHANGED')).toBe(true);
    expect(shouldRefetchPlan('ROUTING_MODE_CHANGED')).toBe(true);
    expect(shouldRefetchPlan('SOS_CREATED')).toBe(false);
    expect(shouldRefetchPlan('BRIGADE_DISPATCHED')).toBe(false);
    expect(shouldRefetchPlan('CITIZEN_SAFE')).toBe(false);
  });
});

describe('didRouteChange', () => {
  it('is false when the same route is returned again', () => {
    expect(didRouteChange(plan(1), plan(1))).toBe(false);
  });

  it('detects a new destination, a new path, or new reroute reasons', () => {
    expect(didRouteChange(plan(1), plan(2))).toBe(true);
    expect(didRouteChange(plan(1), plan(1, [[1, 1], [3, 3]]))).toBe(true);
    expect(didRouteChange(plan(1), plan(1, undefined, ['ROAD_CLOSURE']))).toBe(true);
    expect(didRouteChange(plan(1), plan(null))).toBe(true);
  });

  it('ignores the very first load', () => {
    expect(didRouteChange(null, plan(1))).toBe(false);
  });
});
