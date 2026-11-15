/**
 * Server-side latency instrumentation (Challenge Drop #3: "mean response time
 * < 300 ms under mass requests" must be observable, not just claimed).
 *
 * - Adds `Server-Timing: app;dur=<ms>` to every response.
 * - Keeps a rolling window of the last N durations per route
 *   (method + Express route pattern, e.g. "POST /api/citizen/sos").
 */
const WINDOW = Number(process.env.LATENCY_WINDOW || 2000);
const series = new Map();

function record(key, ms, status) {
  let s = series.get(key);
  if (!s) {
    s = { samples: [], count: 0, errors: 0, rateLimited: 0 };
    series.set(key, s);
  }
  s.samples.push(ms);
  if (s.samples.length > WINDOW) s.samples.shift();
  s.count += 1;
  if (status >= 500) s.errors += 1;
  if (status === 429) s.rateLimited += 1;
}

export function latencyMetrics() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const writeHead = res.writeHead;
    res.writeHead = function patchedWriteHead(...args) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${ms.toFixed(1)}`);
      return writeHead.apply(this, args);
    };
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const route = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.originalUrl.split('?')[0];
      record(`${req.method} ${route}`, ms, res.statusCode);
    });
    next();
  };
}

function summarize(samples) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    window: sorted.length,
    meanMs: Number(mean.toFixed(1)),
    p50Ms: Number(at(0.5).toFixed(1)),
    p95Ms: Number(at(0.95).toFixed(1)),
    p99Ms: Number(at(0.99).toFixed(1)),
    maxMs: Number(sorted.at(-1).toFixed(1)),
  };
}

export function latencySnapshot() {
  const routes = {};
  for (const [key, s] of series) {
    routes[key] = { ...summarize(s.samples), total: s.count, errors: s.errors, rateLimited: s.rateLimited };
  }
  return { targetMeanMs: 300, generatedAt: new Date().toISOString(), routes };
}

export function resetLatencyMetrics() {
  series.clear();
}
