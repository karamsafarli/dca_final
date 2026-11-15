import { describe, expect, it, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  CircuitState,
  TimeoutError,
} from '../../src/resilience/circuitBreaker.js';

function makeBreaker(overrides = {}) {
  let clock = 0;
  const breaker = new CircuitBreaker({
    name: 'test',
    timeoutMs: 50,
    failureThreshold: 3,
    openDurationMs: 1000,
    now: () => clock,
    ...overrides,
  });
  return { breaker, advance: (ms) => (clock += ms) };
}

const ok = () => Promise.resolve('ok');
const fail503 = () => Promise.reject(Object.assign(new Error('503'), { code: 'EXTERNAL_UNAVAILABLE' }));

describe('CircuitBreaker', () => {
  it('passes calls through while CLOSED', async () => {
    const { breaker } = makeBreaker();
    await expect(breaker.execute(ok)).resolves.toBe('ok');
    expect(breaker.state).toBe(CircuitState.CLOSED);
  });

  it('opens after N consecutive failures and then rejects instantly without calling', async () => {
    const { breaker } = makeBreaker();
    for (let i = 0; i < 3; i += 1) await expect(breaker.execute(fail503)).rejects.toThrow('503');
    expect(breaker.state).toBe(CircuitState.OPEN);

    const fn = vi.fn(ok);
    await expect(breaker.execute(fn)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('a success resets the consecutive failure counter', async () => {
    const { breaker } = makeBreaker();
    await breaker.execute(fail503).catch(() => {});
    await breaker.execute(fail503).catch(() => {});
    await breaker.execute(ok);
    await breaker.execute(fail503).catch(() => {});
    expect(breaker.state).toBe(CircuitState.CLOSED);
  });

  it('treats a call slower than timeoutMs as a failure and aborts it', async () => {
    const { breaker } = makeBreaker({ failureThreshold: 1 });
    let aborted = false;
    const slow = (signal) =>
      new Promise((resolve) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        setTimeout(() => resolve('late'), 500);
      });
    await expect(breaker.execute(slow)).rejects.toBeInstanceOf(TimeoutError);
    expect(aborted).toBe(true);
    expect(breaker.state).toBe(CircuitState.OPEN);
  });

  it('goes HALF_OPEN after openDuration; a successful trial closes it', async () => {
    const { breaker, advance } = makeBreaker({ failureThreshold: 1 });
    await breaker.execute(fail503).catch(() => {});
    advance(999);
    await expect(breaker.execute(ok)).rejects.toBeInstanceOf(CircuitOpenError);
    advance(1);
    await expect(breaker.execute(ok)).resolves.toBe('ok');
    expect(breaker.state).toBe(CircuitState.CLOSED);
  });

  it('a failed trial call re-opens the circuit', async () => {
    const { breaker, advance } = makeBreaker({ failureThreshold: 1 });
    await breaker.execute(fail503).catch(() => {});
    advance(1000);
    await breaker.execute(fail503).catch(() => {});
    expect(breaker.state).toBe(CircuitState.OPEN);
  });

  it('allows only one trial call at a time while HALF_OPEN', async () => {
    const { breaker, advance } = makeBreaker({ failureThreshold: 1, timeoutMs: 1000 });
    await breaker.execute(fail503).catch(() => {});
    advance(1000);
    let release;
    const trial = breaker.execute(() => new Promise((r) => (release = r)));
    await expect(breaker.execute(ok)).rejects.toBeInstanceOf(CircuitOpenError);
    release('done');
    await expect(trial).resolves.toBe('done');
  });

  it('emits stateChange events with from/to/reason', async () => {
    const { breaker } = makeBreaker({ failureThreshold: 1 });
    const changes = [];
    breaker.on('stateChange', (c) => changes.push(`${c.from}->${c.to}:${c.reason}`));
    await breaker.execute(fail503).catch(() => {});
    breaker.reset();
    expect(changes).toEqual(['CLOSED->OPEN:EXTERNAL_UNAVAILABLE', 'OPEN->CLOSED:MANUAL_RESET']);
  });
});
