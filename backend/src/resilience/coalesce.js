/**
 * Per-key request coalescing.
 *
 * `singleFlight`: concurrent calls with the same key share ONE in-flight
 *   promise (used to collapse identical concurrent SOS requests).
 *
 * `createCoalescer`: at most one run in progress and one queued run per key.
 *   Callers arriving while a run is in progress all share the queued run, which
 *   starts after the current one and therefore sees everything committed before
 *   them. 500 concurrent SOS in one zone → ~2 crisis evaluations instead of 500
 *   serialized transactions fighting over a lock and the connection pool.
 */
export function singleFlight() {
  const inflight = new Map();
  return async function run(key, fn) {
    if (inflight.has(key)) return { shared: true, value: await inflight.get(key) };
    const promise = (async () => fn())();
    inflight.set(key, promise);
    try {
      return { shared: false, value: await promise };
    } finally {
      inflight.delete(key);
    }
  };
}

export function createCoalescer(task) {
  const state = new Map(); // key -> { running, queued: { arg, promise, resolve, reject } | null }

  const start = (key, arg) => {
    const entry = state.get(key);
    entry.running = Promise.resolve()
      .then(() => task(arg))
      .finally(() => {
        const next = entry.queued;
        entry.queued = null;
        entry.running = null;
        if (next) {
          start(key, next.arg);
          entry.running.then(next.resolve, next.reject);
        } else {
          state.delete(key);
        }
      });
    return entry.running;
  };

  return function schedule(key, arg) {
    if (!state.has(key)) state.set(key, { running: null, queued: null });
    const entry = state.get(key);
    if (!entry.running) return start(key, arg);
    if (entry.queued) {
      entry.queued.arg = arg; // newest trigger wins; the run re-reads the DB anyway
      return entry.queued.promise;
    }
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    entry.queued = { arg, promise, resolve, reject };
    return promise;
  };
}
