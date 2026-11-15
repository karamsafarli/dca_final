import { describe, expect, it } from 'vitest';
import { can, permissionsFor, ROLE_PERMISSIONS } from '../../src/config/permissions.js';
import { withPoolSettings } from '../../src/config/db.js';
import { createCoalescer, singleFlight } from '../../src/resilience/coalesce.js';
import { duplicateKey } from '../../src/services/sosService.js';

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe('singleFlight (duplicate SOS collapse)', () => {
  it('runs ONE task for many concurrent identical keys and marks the rest as shared', async () => {
    const run = singleFlight();
    let executions = 0;
    const task = async () => {
      executions += 1;
      await tick();
      return 'sos-1';
    };
    const results = await Promise.all(Array.from({ length: 100 }, () => run('CIT|FIRE', task)));
    expect(executions).toBe(1);
    expect(results.filter((r) => !r.shared)).toHaveLength(1);
    expect(results.every((r) => r.value === 'sos-1')).toBe(true);
  });

  it('does not collapse different keys', async () => {
    const run = singleFlight();
    let executions = 0;
    await Promise.all(['A|FIRE', 'B|FIRE', 'A|FLOOD'].map((k) => run(k, async () => (executions += 1))));
    expect(executions).toBe(3);
  });
});

describe('createCoalescer (crisis evaluation per zone)', () => {
  it('turns 500 concurrent triggers into at most 2 runs (one running + one queued)', async () => {
    let runs = 0;
    const schedule = createCoalescer(async () => {
      runs += 1;
      await tick(10);
      return `run-${runs}`;
    });
    const results = await Promise.all(Array.from({ length: 500 }, (_, i) => schedule('zone-1', i)));
    expect(runs).toBe(2);
    expect(new Set(results)).toEqual(new Set(['run-1', 'run-2']));
  });

  it('keeps zones independent and passes the newest trigger to the queued run', async () => {
    const seen = [];
    const schedule = createCoalescer(async (arg) => {
      seen.push(arg);
      await tick(5);
    });
    await Promise.all([schedule('a', 1), schedule('a', 2), schedule('a', 3), schedule('b', 9)]);
    expect(seen).toEqual(expect.arrayContaining([1, 3, 9]));
    expect(seen).not.toContain(2);
  });

  it('propagates a failed run to its callers and recovers for the next one', async () => {
    let fail = true;
    const schedule = createCoalescer(async () => {
      if (fail) throw new Error('boom');
      return 'ok';
    });
    await expect(schedule('z', 1)).rejects.toThrow('boom');
    fail = false;
    await expect(schedule('z', 2)).resolves.toBe('ok');
  });
});

describe('duplicateKey', () => {
  it('is per citizen AND hazard; anonymous requests are never merged', () => {
    expect(duplicateKey('CIT-1', 'FIRE')).toBe('CIT-1|FIRE');
    expect(duplicateKey(' CIT-1 ', 'FIRE')).toBe('CIT-1|FIRE');
    expect(duplicateKey('CIT-1', 'FLOOD')).not.toBe(duplicateKey('CIT-1', 'FIRE'));
    expect(duplicateKey(undefined, 'FIRE')).toBeNull();
  });
});

describe('RBAC permission matrix', () => {
  it('only lets operational roles dispatch brigades', () => {
    expect(can('OBSERVER', 'brigades:dispatch')).toBe(false);
    expect(can('DISPATCHER', 'brigades:dispatch')).toBe(true);
    expect(can('COMMANDER', 'brigades:dispatch')).toBe(true);
  });

  it('reserves destructive system reset for COMMANDER', () => {
    expect(can('DISPATCHER', 'system:reset')).toBe(false);
    expect(can('COMMANDER', 'system:reset')).toBe(true);
  });

  it('denies unknown roles everything and gives every role read access', () => {
    expect(can('HACKER', 'dashboard:read')).toBe(false);
    expect(permissionsFor('HACKER')).toEqual([]);
    for (const role of Object.keys(ROLE_PERMISSIONS)) expect(can(role, 'dashboard:read')).toBe(true);
  });
});

describe('Prisma pool sizing', () => {
  it('adds an explicit connection pool unless one is configured', () => {
    expect(withPoolSettings('postgresql://u:p@h:5432/db?schema=public', 25)).toBe(
      'postgresql://u:p@h:5432/db?schema=public&connection_limit=25&pool_timeout=10'
    );
    expect(withPoolSettings('postgresql://h/db?connection_limit=5')).toBe('postgresql://h/db?connection_limit=5');
  });
});
