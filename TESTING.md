# Testing Strategy — Urban Crisis & Crowd Evacuation Engine

All tests are automated spec files and run in CI (`.github/workflows/ci.yml`) on every push and pull request.

## Summary

| Suite | Command | Tests | What it proves |
|---|---|---|---|
| Backend unit | `cd backend && npm test` | 72 | Pure rules: routing, rerouting, thresholds, circuit breaker, fallback chain, rate limits, CORS, error contract |
| Backend integration | `cd backend && npm run test:integration` | 55 | Real PostgreSQL + Prisma transactions, real HTTP to the routing provider, real Socket.IO server |
| Frontend | `cd frontend && npm test` | 24 | i18n parity (AZ = EN keys and placeholders), Red Alert banner, offline banner, route card, API error translation |
| Coverage | `cd backend && npm run test:coverage` | 127 | **92.3 % lines · 94.6 % functions · 81.2 % branches** (CI fails below 80 / 80 / 70) |
| Load test | `cd backend && npm run loadtest` | 600 × 3 scenarios | Botnet mean **141–252 ms** (< 300 ms), duplicate storm → 1 record, single source → 429 |

## Requirement → test traceability

| Requirement (task.txt) | Test file(s) |
|---|---|
| Nearest assembly points, occupancy %, recommended route | `unit/crisisAndRouting.test.js`, `integration/routingResilience.int.test.js` |
| Auto alternative route when a road closes | `unit/crisisAndRouting.test.js` (reroute), `integration/simulation.int.test.js` (road-toggle → plan avoids road) |
| Auto alternative route at **90 %** occupancy | `unit/thresholds.test.js` (89.9 % keeps / 90 % reroutes), `unit/crisisAndRouting.test.js` |
| One-click SOS (4 hazard types) + "I am safe" | `integration/citizenSafety.int.test.js` |
| Live dispatcher dashboard (SOS, occupancy, brigades) | `integration/realtime.int.test.js`, `integration/citizenSafety.int.test.js` |
| Red Alert: **≥ 4 distinct** SOS / **500 m** or same zone / **5 min** | `unit/thresholds.test.js` (500 m vs 501 m, window start), `unit/crisisRules.test.js` (distinct citizens), `integration/crisisEngine.int.test.js` |
| Red Alert: occupancy **> 95 %** | `unit/thresholds.test.js` (95.0 % no / 95.2 % yes), `integration/crisisEngine.int.test.js` |
| One-click execute (brigade + new assembly point) | `integration/crisisEngine.int.test.js` (incl. two dispatchers clicking at once → exactly one brigade) |
| **Drop #1** Priority #1 special-care SOS + step-free route | `unit/crisisAndRouting.test.js`, `unit/crisisRules.test.js` (MEDICAL unit preferred), `component EvacuationRouteCard.test.jsx` |
| **Drop #1** AZ / EN switching | `frontend i18n/translations.test.js`, `RedAlertBanner.test.jsx`, `lib/api.test.js` |
| **Drop #2** Routing API 503 / > 5 s → circuit breaker + fallback + "Oflayn" notice | `unit/circuitBreaker.test.js`, `unit/routingGateway.test.js`, `integration/routingResilience.int.test.js`, `RoutingModeBanner.test.jsx` |
| **Drop #3** 500+ SOS flood: rate limit + duplicate filter, panel not blocked | `integration/sosFlood.int.test.js`, `unit/floodProtection.test.js`, `unit/rateLimits.test.js`, `frontend lib/throttle.test.js` |
| **Drop #3** Brigade dispatch protected by JWT + RBAC | `integration/rbac.int.test.js`, `SosFeedList.test.jsx`, `RedAlertBanner.test.jsx` |
| **Drop #3** Mean latency < 300 ms under mass requests | `integration/sosFlood.int.test.js` (server-side mean via `Server-Timing`), `loadtest/sosFlood.js` (end-to-end) |

## Reliability & security scenarios covered

- **Concurrency:** 4 SOS arriving simultaneously → one alert; two simultaneous "execute" clicks → one brigade; two alerts racing for the last free brigade → never the same brigade.
- **Ownership (IDOR):** closing an SOS needs its one-time access token (400 without, 403 wrong token).
- **Privacy:** anonymous sockets never receive SOS names/phones; a citizen only receives a PII-free status of their own SOS.
- **External dependency failure:** HTTP 503, > timeout, provider process gone (connection refused), circuit open (no calls made), stale cache never used after a road closes, automatic recovery.
- **Abuse:** SOS flood → 429, failed logins → 429, CORS refuses foreign origins, JWT never in a response body.
- **Input validation:** invalid body / query / path params → 400 with a stable `code`.

## Load test (`backend/loadtest/sosFlood.js`)

No dependencies. Three scenarios with 600 requests at concurrency 500 after a 100-request warm-up: **botnet** (distinct IPs via `X-Forwarded-For` + distinct citizens), **single-source flood**, **duplicate storm**; a dispatcher loads the dashboard throughout and dispatches a brigade afterwards. Exit code 0 only if the botnet mean is < 300 ms. Run it inside the Docker network to exclude Docker Desktop's port proxy (see README §8).

Why two latency numbers: the in-process integration test asserts the **server-side** mean (from `Server-Timing`, ~50–100 ms) because a single test process cannot open 600 raw TCP connections at once (macOS listen backlog = 128); the load test measures **end-to-end** latency against the real container.

## How the integration tests run

They use a **separate database `urban_crisis_test`** and never touch the demo database. The schema is synced once per run (`prisma db push`, non-destructive), and every test reseeds the deterministic Baku dataset. The setup refuses to run against a database whose name does not end in `_test`.

```bash
docker compose up -d postgres
docker exec urban_crisis_postgres psql -U crisis_user -d urban_crisis -c "CREATE DATABASE urban_crisis_test"
cd backend && npm run test:integration
```

The routing-provider tests start the simulated external API in-process on a random port and shorten the 5 s timeout to 400 ms so the suite stays fast. The production default (5000 ms) is asserted in `unit/thresholds.test.js` and was verified manually against the running container (cut-off at 5.03 s).

## Known advisories (`npm audit --omit=dev`)

| Package | Why it is not upgraded yet |
|---|---|
| `zod` < 4.6.6 (memory exhaustion on oversized collections) | Fix is a major upgrade (zod 4). Mitigated: public API schemas contain no unbounded collections (the only array, routing destinations, is capped at 200), string fields have `.max()` limits, and request bodies are capped at 1 MB. |
| `deepmerge-ts` (via Prisma toolchain) | Fixed only by a Prisma major/minor change that mismatches client and CLI; used at build/CLI time, not on request paths. |

## Not covered (by decision)

Browser end-to-end tests (Playwright) were left out under hackathon time limits. The end-to-end flows are covered at the API + Socket.IO level instead, and were checked manually in the browser.
