import { EventEmitter } from 'node:events';

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED', // healthy: calls go through
  OPEN: 'OPEN', // failing: calls are rejected instantly (no waiting on a dead service)
  HALF_OPEN: 'HALF_OPEN', // probing: one trial call decides CLOSED vs OPEN
});

/** Thrown without calling the dependency while the circuit is OPEN. */
export class CircuitOpenError extends Error {
  constructor(name) {
    super(`Circuit "${name}" is OPEN`);
    this.name = 'CircuitOpenError';
    this.code = 'CIRCUIT_OPEN';
  }
}

/** Thrown when a call exceeds `timeoutMs`. */
export class TimeoutError extends Error {
  constructor(name, timeoutMs) {
    super(`"${name}" did not respond within ${timeoutMs} ms`);
    this.name = 'TimeoutError';
    this.code = 'TIMEOUT';
  }
}

/**
 * Minimal, dependency-free circuit breaker.
 *
 * CLOSED --(failureThreshold consecutive failures)--> OPEN
 * OPEN   --(openDurationMs elapsed)------------------> HALF_OPEN (one trial call)
 * HALF_OPEN --success--> CLOSED, --failure--> OPEN
 *
 * Every call is bounded by `timeoutMs`; a timeout counts as a failure and the
 * underlying request is aborted through the AbortSignal passed to `fn`.
 * Emits `stateChange` with { name, from, to, reason, at }.
 */
export class CircuitBreaker extends EventEmitter {
  constructor({
    name = 'dependency',
    timeoutMs = 5000,
    failureThreshold = 3,
    openDurationMs = 20000,
    now = () => Date.now(),
  } = {}) {
    super();
    this.name = name;
    this.timeoutMs = timeoutMs;
    this.failureThreshold = failureThreshold;
    this.openDurationMs = openDurationMs;
    this.now = now;

    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenInFlight = false;
    this.lastFailure = null;
    this.lastSuccessAt = null;
  }

  /** Can a real call be attempted right now? (May move OPEN -> HALF_OPEN.) */
  #acquire() {
    if (this.state === CircuitState.OPEN) {
      if (this.now() - this.openedAt < this.openDurationMs) return false;
      this.#transition(CircuitState.HALF_OPEN, 'OPEN_DURATION_ELAPSED');
    }
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenInFlight) return false;
      this.halfOpenInFlight = true;
    }
    return true;
  }

  /**
   * Execute `fn(signal)` under the breaker. Rejects with CircuitOpenError
   * (instantly), TimeoutError, or the dependency's own error.
   */
  async execute(fn) {
    if (!this.#acquire()) throw new CircuitOpenError(this.name);

    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new TimeoutError(this.name, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([fn(controller.signal), timeout]);
      this.#onSuccess();
      return result;
    } catch (err) {
      this.#onFailure(err);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  #onSuccess() {
    this.halfOpenInFlight = false;
    this.consecutiveFailures = 0;
    this.lastSuccessAt = new Date(this.now()).toISOString();
    if (this.state !== CircuitState.CLOSED) {
      this.#transition(CircuitState.CLOSED, 'TRIAL_CALL_SUCCEEDED');
    }
  }

  #onFailure(err) {
    this.halfOpenInFlight = false;
    this.consecutiveFailures += 1;
    this.lastFailure = {
      code: err?.code || err?.name || 'ERROR',
      message: err?.message,
      at: new Date(this.now()).toISOString(),
    };
    if (
      this.state === CircuitState.HALF_OPEN ||
      (this.state === CircuitState.CLOSED &&
        this.consecutiveFailures >= this.failureThreshold)
    ) {
      this.openedAt = this.now();
      this.#transition(CircuitState.OPEN, this.lastFailure.code);
    }
  }

  #transition(to, reason) {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    this.emit('stateChange', {
      name: this.name,
      from,
      to,
      reason,
      at: new Date(this.now()).toISOString(),
    });
  }

  /** Force CLOSED (used by the demo "reset" and by tests). */
  reset() {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenInFlight = false;
    this.#transition(CircuitState.CLOSED, 'MANUAL_RESET');
  }

  snapshot() {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      failureThreshold: this.failureThreshold,
      timeoutMs: this.timeoutMs,
      openDurationMs: this.openDurationMs,
      retryAt:
        this.state === CircuitState.OPEN && this.openedAt !== null
          ? new Date(this.openedAt + this.openDurationMs).toISOString()
          : null,
      lastFailure: this.lastFailure,
      lastSuccessAt: this.lastSuccessAt,
    };
  }
}
