import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { throttle } from './throttle';

describe('throttle (dispatcher refresh under SOS flood)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('turns 500 events in one second into 2 refreshes (leading + trailing)', () => {
    const fn = vi.fn();
    const t = throttle(fn, 1000);
    for (let i = 0; i < 500; i += 1) {
      t(i);
      vi.advanceTimersByTime(1);
    }
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(499);
  });

  it('runs immediately when idle', () => {
    const fn = vi.fn();
    throttle(fn, 1000)('a');
    expect(fn).toHaveBeenCalledWith('a');
  });
});
