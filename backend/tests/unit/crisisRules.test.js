import { describe, expect, it } from 'vitest';
import { rankBrigades } from '../../src/services/brigadeAllocation.js';
import {
  clusterWindowStart,
  dedupeSignalsByCitizen,
  detectSosCluster,
} from '../../src/services/crisisEngineService.js';

const at = (iso) => new Date(iso);

describe('Distinct-citizen rule', () => {
  const base = { zoneId: 1, lat: 40.375, lng: 49.815 };

  it('keeps only the latest signal per citizen code', () => {
    const signals = [
      { id: 1, citizenCode: 'A', createdAt: at('2026-01-01T10:00:00Z'), ...base },
      { id: 2, citizenCode: 'A', createdAt: at('2026-01-01T10:01:00Z'), ...base },
      { id: 3, citizenCode: 'B', createdAt: at('2026-01-01T10:00:30Z'), ...base },
    ];
    expect(dedupeSignalsByCitizen(signals).map((s) => s.id).sort()).toEqual([2, 3]);
  });

  it('treats signals without a citizen code as distinct', () => {
    const signals = [{ id: 1, ...base }, { id: 2, ...base }];
    expect(dedupeSignalsByCitizen(signals)).toHaveLength(2);
  });

  it('needs 4 different citizens, not 4 taps', () => {
    const fromOnePerson = [1, 2, 3, 4].map((id) => ({ id, citizenCode: 'SAME', ...base }));
    expect(detectSosCluster(fromOnePerson[3], fromOnePerson)).toBeNull();

    const threePeople = [...fromOnePerson, { id: 5, citizenCode: 'X', ...base }, { id: 6, citizenCode: 'Y', ...base }];
    expect(detectSosCluster(threePeople[5], threePeople)).toBeNull();

    const fourPeople = [...threePeople, { id: 7, citizenCode: 'Z', ...base }];
    expect(detectSosCluster(fourPeople[6], fourPeople)?.sosCount).toBe(4);
  });
});

describe('Cluster counting window', () => {
  const now = at('2026-01-01T12:00:00Z');

  it('is the last 5 minutes when no alert was resolved recently', () => {
    expect(clusterWindowStart(now, null)).toEqual(at('2026-01-01T11:55:00Z'));
    expect(clusterWindowStart(now, at('2026-01-01T11:00:00Z'))).toEqual(at('2026-01-01T11:55:00Z'));
  });

  it('starts at the operator decision when it is inside the 5-minute window', () => {
    expect(clusterWindowStart(now, at('2026-01-01T11:58:00Z'))).toEqual(at('2026-01-01T11:58:00Z'));
  });
});

describe('Brigade ranking', () => {
  const brigades = [
    { id: 1, zoneId: 2, unitType: 'MEDICAL', status: 'AVAILABLE' },
    { id: 2, zoneId: 1, unitType: 'FIRE', status: 'STANDBY' },
    { id: 3, zoneId: 1, unitType: 'FIRE', status: 'AVAILABLE' },
    { id: 4, zoneId: 1, unitType: 'MEDICAL', status: 'STANDBY' },
  ];

  it('prefers same zone, then preferred unit type, then AVAILABLE', () => {
    expect(rankBrigades(brigades, { zoneId: 1 }).map((b) => b.id)).toEqual([3, 2, 4, 1]);
    expect(
      rankBrigades(brigades, { zoneId: 1, preferUnitTypes: ['MEDICAL'] }).map((b) => b.id)
    ).toEqual([4, 3, 2, 1]);
  });
});

describe('shouldRaiseCapacityAlert', () => {
  it('raises the first time and only again when occupancy grows past the handled level', async () => {
    const { shouldRaiseCapacityAlert } = await import('../../src/services/crisisEngineService.js');
    expect(shouldRaiseCapacityAlert(97, null)).toBe(true);
    expect(shouldRaiseCapacityAlert(97, 97)).toBe(false);
    expect(shouldRaiseCapacityAlert(96, 97)).toBe(false);
    expect(shouldRaiseCapacityAlert(99, 97)).toBe(true);
  });
});
