/**
 * SOS flood / spam-attack load test (Challenge Drop #3).
 *
 *   node loadtest/sosFlood.js [--url http://localhost:4050] [--requests 600] [--concurrency 500] [--warmup 100]
 *
 * Scenarios (run sequentially against a running backend):
 *   1. botnet          N requests from N distinct client IPs (X-Forwarded-For) with
 *                      distinct citizen codes → the expensive "accepted" path.
 *   2. single-source   N requests from ONE IP → must be cut off by rate limiting.
 *   3. duplicate-storm N requests, ONE citizen code, distinct IPs → duplicate filter.
 * During scenario 1 a dispatcher keeps loading the dashboard and dispatching a
 * brigade, to prove critical operations stay responsive under the flood.
 *
 * Requires the dispatcher seed account (default dispatcher1). Pass
 * --password or set SEED_DISPATCHER_PASSWORD if it was changed.
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), [])
);
const BASE = args.url || process.env.LOADTEST_URL || 'http://localhost:4050';
const N = Number(args.requests || 600);
const CONCURRENCY = Number(args.concurrency || 500);
const HAZARDS = ['FIRE', 'COLLAPSE', 'FLOOD', 'MEDICAL'];
const RUN = Date.now().toString(36);

const ip = (i) => `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;

function stats(samples) {
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const pick = (p) => ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))] ?? 0;
  const mean = ms.reduce((a, b) => a + b, 0) / (ms.length || 1);
  const byStatus = samples.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
  return { count: ms.length, mean: Math.round(mean), p50: Math.round(pick(50)), p95: Math.round(pick(95)), p99: Math.round(pick(99)), max: Math.round(ms.at(-1) ?? 0), byStatus };
}

async function timed(fn) {
  const t0 = performance.now();
  let status = 0;
  try {
    const res = await fn();
    status = res.status;
    await res.arrayBuffer();
  } catch {
    status = 'ERR';
  }
  return { ms: performance.now() - t0, status };
}

async function pool(total, concurrency, makeRequest) {
  const samples = [];
  let next = 0;
  const worker = async () => {
    while (next < total) {
      const i = next++;
      samples.push(await timed(() => makeRequest(i)));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return samples;
}

const postSos = (i, { forwardedFor, citizenCode, zoneId }) =>
  fetch(`${BASE}/api/citizen/sos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
    body: JSON.stringify({ citizenCode, hazardType: HAZARDS[i % 4], zoneId }),
  });

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.255.255.254' },
    body: JSON.stringify({
      username: args.user || 'dispatcher1',
      password: args.password || process.env.SEED_DISPATCHER_PASSWORD || 'Fhn112!Crisis',
    }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  return res.headers.get('set-cookie').split(';')[0];
}

async function main() {
  const zones = (await (await fetch(`${BASE}/api/zones`)).json()).zones;
  const cookie = await login();
  const WARMUP = Number(args.warmup ?? 100);
  console.log(`Target ${BASE} · ${N} requests · concurrency ${CONCURRENCY} · warm-up ${WARMUP}\n`);

  // Warm-up (not measured): lets V8 JIT-compile the hot path, as after any deploy
  await pool(WARMUP, 20, (i) =>
    postSos(i, { forwardedFor: ip(200000 + i), citizenCode: `WARM-${RUN}-${i}`, zoneId: zones[i % zones.length].id })
  );

  // 1. Botnet flood + concurrent dispatcher critical operations
  let flooding = true;
  const dispatcherSamples = [];
  const dispatcherLoop = (async () => {
    while (flooding) {
      dispatcherSamples.push(await timed(() => fetch(`${BASE}/api/dispatcher/dashboard`, { headers: { cookie } })));
    }
  })();
  const botnet = await pool(N, CONCURRENCY, (i) =>
    postSos(i, { forwardedFor: ip(i + 1), citizenCode: `BOT-${RUN}-${i}`, zoneId: zones[i % zones.length].id })
  );
  flooding = false;
  await dispatcherLoop;

  const dash = await (await fetch(`${BASE}/api/dispatcher/dashboard`, { headers: { cookie } })).json();
  const pending = dash.sosSignals?.find((s) => s.status === 'PENDING');
  const dispatchSample = pending
    ? await timed(() =>
        fetch(`${BASE}/api/dispatcher/sos/${pending.id}/dispatch`, {
          method: 'POST',
          headers: { cookie, 'content-type': 'application/json' },
          body: '{}',
        })
      )
    : null;

  // 2. Single-source flood
  const single = await pool(N, CONCURRENCY, (i) =>
    postSos(i, { forwardedFor: '10.200.0.1', citizenCode: `SINGLE-${RUN}-${i}`, zoneId: zones[0].id })
  );

  // 3. Duplicate storm: one citizen, many IPs
  const dup = await pool(N, CONCURRENCY, (i) =>
    postSos(0, { forwardedFor: ip(100000 + i), citizenCode: `DUP-${RUN}`, zoneId: zones[1].id })
  );

  const report = {
    botnet_sos: stats(botnet),
    dispatcher_dashboard_during_flood: stats(dispatcherSamples),
    dispatcher_dispatch_after_flood: dispatchSample && { ms: Math.round(dispatchSample.ms), status: dispatchSample.status },
    single_source_flood: stats(single),
    duplicate_storm: stats(dup),
  };
  console.table(
    Object.fromEntries(
      Object.entries(report)
        .filter(([, v]) => v && v.count !== undefined)
        .map(([k, v]) => [k, { n: v.count, mean: v.mean, p50: v.p50, p95: v.p95, p99: v.p99, max: v.max, statuses: JSON.stringify(v.byStatus) }])
    )
  );
  console.log('dispatch brigade after flood:', report.dispatcher_dispatch_after_flood);
  const accepted = botnet.filter((s) => s.status === 201 || s.status === 200);
  const meanAll = stats(botnet).mean;
  console.log(`\nBotnet mean latency: ${meanAll} ms (${accepted.length} accepted) → ${meanAll < 300 ? 'PASS' : 'FAIL'} (< 300 ms)`);
  if (args.json) console.log(JSON.stringify(report));
  process.exit(meanAll < 300 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
