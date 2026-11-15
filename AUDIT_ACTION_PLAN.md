# Audit & Action Plan — Urban Crisis & Crowd Evacuation Engine

> Internal working document. Do not submit it to the jury: it lists weaknesses. Delete it or add it to `.gitignore` before you submit.
> Audited against `task.txt` (base task + Challenge Drops #1 and #2), 2026-11-15.

## Baseline (what already works)
- Both modules exist: citizen plan (zone/coordinate/GPS → nearest points, occupancy %, Dijkstra route), one-click SOS (4 hazard types) + "I'm safe", dispatcher dashboard, Red Alert (4 SOS/500 m/5 min or >95%) with one-click execute.
- Challenge Drop #1: `SPECIAL_CARE` → `priorityLevel=1`, accessible-only routing, AZ/EN switch.
- Docker Compose, JWT/scrypt auth, Zod body validation, Socket.IO, 16 passing backend tests, `vite build` OK.

---

## Progress
- ✅ Batch 1 (committed 97f5eda): P0 #1–#4, S1–S3, #6 partial, #7.
- ✅ **Challenge Drop #2** (external routing API down → Circuit Breaker / Fallback): separate `routing-api` container, 5 s timeout breaker, cache → local graph → coordinate-matrix fallback, citizen offline banner, dispatcher API fault controls, health probe auto-recovery.
- ✅ Batch 2: P0 #5 (assistance panel + `needsTransport` → Priority #1), #8 (coded errors translated client-side, dead AZ labels removed), #9 (refetch only for 6 route-affecting events, 400 ms debounce, toast only on real change), #10 (`SafetyCheckIn` table), capacity alert no longer re-fires after resolution unless occupancy rises.
- Tests now: backend 51 unit + 28 integration, frontend 19.
- Still open from P0: #6 remainder (show the step-free route for a priority SOS on the dispatcher map), #9 server-side plan cache (optional).

## P0 — Correctness bugs (Core functionality 30% + Challenge Drop 20%)

| # | Finding | Where | Fix |
|---|---|---|---|
| 1 ✅ | The task requires 4 **distinct** SOS signals, but the code doesn't dedupe them. One citizen tapping SOS 4 times raises a Red Alert. | `crisisEngineService.js` `detectSosCluster` | Count unique `citizenCode`s. Block or merge a second active SOS from the same citizen. |
| 2 ✅ | **Re-alert storm.** After an alert is executed, its signals stay `DISPATCHED` inside the 5-minute window, so the next SOS in that zone opens a new Red Alert right away. | `evaluateSosCrisis` | Leave out signals already covered by an EXECUTED alert, or add a cooldown per zone. |
| 3 ✅ | **Race conditions.** Concurrent SOS requests create duplicate ACTIVE alerts (find-then-create). Two concurrent "execute" clicks both dispatch a brigade, because READ COMMITTED doesn't block it. The tech doc claims this case is safe. | `crisisEngineService.js` | Use a conditional `updateMany({where:{id,status:'ACTIVE'}})` as the lock, plus a partial unique index or an advisory lock for alert creation. Add a concurrency test. |
| 4 ✅ | In EN mode, a capacity alert shows the **SOS-cluster message**. The code checks `'SHELTER_CRITICAL_95'`, but the enum value is `CAPACITY_OVERFLOW`. | `RedAlertBanner.jsx:20` | Fix the enum value and move the text into translations. |
| 5 ✅ | SPECIAL_CARE user with no accessible route: `recommendedPoint=null` and the card renders **nothing**. There is no fallback telling them to request medical transport. | `EvacuationRouteCard.jsx:98` | Add an explicit "No step-free route — medical transport requested" state and auto-flag the SOS. |
| 6 | Priority #1 SOS doesn't prefer a MEDICAL or accessible-transport brigade. A manual dispatch with `brigadeId` doesn't check that the brigade is available, so a busy brigade can be re-dispatched. | `sosService.dispatchBrigadeToSos` | Match unit type to priority, return 409 for a busy brigade, and show the accessible route for priority SOS on the dispatcher map. |
| 7 ✅ | Query and path params aren't validated. `?zoneId=abc` silently returns 200 with a default zone; `/alerts/abc/...` reaches Prisma (NaN → 500). | routes | Use Zod for `query` and `params` (`validateQuery`, `validateParams`). |
| 8 ✅ | i18n leaks: backend errors, alert `title`/`message` and closure reasons are stored or returned in Azerbaijani. `constants/labels.js` hardcodes AZ labels and is mostly dead code. | services, `labels.js` | Return `code` + `params` from the API and translate on the client. Delete the dead labels. |
| 9 ✅ | Every `state:updated` event (any SOS, from anyone) makes **every citizen** refetch the plan, and each refetch runs 2× Dijkstra per assembly point. The "route recalculated" toast fires even when nothing changed. | `CitizenPage.jsx` | Only refetch on road or occupancy events (debounced). Toast only when the recommended point or route actually changed. Cache plans per (zone, category) on the server. |
| 10 ✅ | A "safe" call with no prior SOS creates a fake `MEDICAL` record in zone #1, which pollutes the stats. | `markCitizenSafe` | Use a separate `SafetyCheckin` record with real coordinates. |

## P1 — Security (Reliability 15% + tech defense)

| # | Finding | Fix |
|---|---|---|
| S1 ✅ | **IDOR.** `PATCH /citizen/safe` is unauthenticated. Anyone can close anyone's SOS through a sequential `sosId` or a guessable 5-char `citizenCode` (`Math.random`). | Return a random `sosToken` (crypto) on SOS creation and require it. Generate citizen IDs with `crypto.randomUUID()`. |
| S2 ✅ | **PII broadcast.** `io.emit('sos:updated', …)` sends the name, phone and coordinates to *every* socket, including anonymous citizens. The tech doc claims it doesn't. | Send full data only to the `dispatchers` room. Send the citizen only their own SOS (room per `sosToken`). |
| S3 ✅ | **CORS reflects any origin with credentials.** Verified: `Origin: https://evil.example` → ACAO echoed + `Allow-Credentials: true`, because compose sets `FRONTEND_ORIGIN="*"`. | Use an explicit allow-list and never `true` with credentials. |
| S4 | No rate limit on `POST /citizen/sos`, so anyone can spam fake SOS signals and fake Red Alerts. | `express-rate-limit` per IP + per citizen, plus the dedupe from #1. |
| S5 | `trust proxy` isn't set. Behind nginx every user shares one `req.ip`, so 10 bad logins lock out **all** dispatchers. The in-memory map also never evicts entries. | `app.set('trust proxy', 1)`, then use `express-rate-limit`. |
| S6 | Login returns the JWT in the JSON body as well as the HttpOnly cookie, which defeats the point of HttpOnly. | Drop `token` from the response (keep Bearer for tests via a helper). |
| S7 | The default JWT secret is hardcoded in `docker-compose.yml`. Postgres 5432 is published with default creds. The backend container runs as root. | Use `.env` (with a `.env.example`), stop publishing 5432, add `USER node`, add a backend healthcheck. |
| S8 | `prisma db push` runs on container start. There's no migration history, which risks data loss. | `prisma migrate dev` → commit `migrations/`, then `migrate deploy` in Docker. |
| S9 | Dismissing an alert has no audit trail, unlike execute. Both roles can do everything (no RBAC), and `/health` leaks the Node version. | Add `dismissedBy` + reason, keep reset/simulation for COMMANDER only, and trim `/health`. |
| S10 | No CSP tuned for the map tiles, no `npm audit` step. | Configure helmet CSP and add `npm audit` to CI. |

## P2 — Tests (Test/reliability 15%, currently the weakest area)
Today there is 1 backend file and 16 tests. It has no DB integration tests, no socket tests, no frontend tests, no e2e, no coverage tool and no CI.
1. **Restructure the backend**: `tests/unit/{routing,evacuation,crisisEngine,geometry,auth}.test.js`, `tests/integration/*.int.test.js`.
2. **Unit edge cases**: exactly 500 m / 501 m, exactly 90% / 95% / 95.1%, 5-minute window boundary, the 4-distinct-citizens rule (#1), unreachable graph, all points ≥90%, no accessible route, congested-road penalty.
3. **Integration with a real Postgres** (Testcontainers or a compose `postgres-test` service): SOS → alert, execute → brigade + point opened (transaction), concurrent execute (#3), re-alert cooldown (#2), safe with token (S1), road close → plan reroutes, 401/403/400/404/409/429 paths.
4. **Socket.IO tests**: dispatcher room isolation, and a citizen never receives others' PII (S2).
5. **Frontend**: Vitest + React Testing Library for the i18n switch (no missing keys: script that diffs AZ/EN keys), SOS panel, route card states, alert banner (#4).
6. **E2E with Playwright** (the demo story): citizen sees route → dispatcher closes road → citizen reroutes live; 4 citizens SOS → Red Alert → execute; SPECIAL_CARE → Priority #1 at top + step-free route; AZ↔EN.
7. Add `@vitest/coverage-v8` with thresholds (≥80% on services), and put the coverage badge or numbers in the README.
8. **GitHub Actions CI**: lint → unit → integration (postgres service) → build → e2e. Show a green badge.
9. Optional: a k6/autocannon load test for `POST /sos` + evacuation plan, with numbers in the doc.

## P3 — Architecture & code quality (15%)
- Add ESLint + Prettier to both packages, plus a root `package.json` with scripts (`test`, `lint`, `dev`).
- Layering is inconsistent: some routes call Prisma directly (`/zones`, `/traffic/roads`, `/alerts/:id/dismiss`). Move all of it to services or repositories.
- Use an `AppError` class with codes (also fixes #8) instead of ad-hoc `err.statusCode`.
- Use an event bus or `realtime.js` instead of `io.emit` scattered across services; services stay pure, sockets subscribe.
- Add a **TrafficProvider adapter** (`SimulatedTrafficProvider`, optional `OsrmProvider`). This answers the "external routing API" requirement explicitly.
- Validate env with Zod at startup (`config/env.js`).
- Dijkstra uses an array sorted on every pop. Use a binary heap. It's fine at the current size, but the jury may ask.
- Frontend: lazy-load the dispatcher route (the bundle is 560 KB > 500 KB warning), add an Error Boundary, and extract `useEvacuationPlan` / `useDispatcherDashboard` hooks out of the 300-line pages.
- Optional: migrate to TypeScript only if time allows. JSDoc + `// @ts-check` is the cheaper option.
- Prepare for the next Challenge Drops: keep thresholds and roles data-driven (a `CitizenCategory` → routing-constraints map) so new roles or hazards are config changes.

## P4 — UI/UX (Demo 10% + first impression for every criterion)
The current UI has the generic "AI dashboard" look: dark slate, glow shadows, pill badges everywhere, identical rounded-2xl cards, 50 instances of 9–11px text and only 2 `aria-*` attributes.
- **Citizen (mobile-first, crisis UX)**: on mobile the SOS buttons sit ~800 px below the fold, under the role and zone pickers. Lead with one status line ("Go to X · 650 m · 9 min · 42% full") and put SOS in a sticky bottom action bar. Move role and location into a compact header or sheet.
- Add a 3-second "Sending… Undo" on SOS to stop accidental taps (it's still one click).
- Show a reroute **banner explaining why** ("Road X closed → new route via Y"), not just a toast.
- **Accessibility**, which matters given the wheelchair drop: minimum 14–16px text, WCAG AA contrast, focus rings, aria-labels on icon buttons, `aria-live` for route/alert changes, a text route list as an alternative to the map, and a high-contrast or light theme.
- **Map**: road segments are straight lines between nodes, which looks fake. Pre-bake real street geometry into seed `waypoints` (one-off OSRM export). Use distinct icons for Shelter/Park/Stadium, occupancy rings, and highlight closed roads.
- **Dispatcher**: KPI cards fill the first screen and the map and SOS queue are below the fold. Make it map-centric with the SOS queue in a side rail. Keep Red Alert sticky and prominent, with a confirm step that shows *what will happen* (which brigade, which point). Move the simulator into a collapsible "Demo mode" drawer.
- Add skeleton loading, empty states and error states. Keep one restrained design system (one accent per meaning: red = SOS/alert, amber = warning, green = safe, violet = priority).

## P5 — Documentation (juries and AI graders)
Checklist items from `task.txt`: ① source ✔ ② README (run + challenge-drop adaptation + architecture diagram) ⚠ ③ AI declaration ⚠ ④ technical doc **in Word/Notepad** ✖ (only `.md` exists).
- **Fix false claims** in `TECHNICAL_DOC.md` (PII not broadcast, double-dispatch prevented, CORS). Graders will check them against the code.
- **TECHNICAL_DOC → also `.docx`** (the task literally says MS Word or notepad), in AZ + EN.
- **README**: bilingual (AZ/EN), badges (CI, coverage), screenshots or GIF, a requirement → implementation → test traceability matrix (very persuasive for AI graders), quick-start in 3 commands, demo credentials, test commands (unit/integration/e2e), known limitations.
- **Architecture**: keep the mermaid diagram, and add a sequence diagram (SOS → crisis engine → alert → execute), an ER diagram, and the socket event catalogue (event, room, payload).
- **API docs**: OpenAPI 3 spec + Swagger UI at `/api/docs`.
- **`docs/CHALLENGE_DROPS.md`**: per drop, the requirement, design decision, files changed, tests added and time spent. Update it every hour.
- **`docs/adr/`**: 3–5 short ADRs (Prisma/Postgres, in-memory Dijkstra vs PostGIS, Socket.IO rooms, cookie JWT).
- **AI_DECLARATION**: it lists only Antigravity/Gemini. Add every tool actually used, including Claude Code for this audit, with phase, prompt examples, what was rejected or corrected by humans, and how AI output was verified (tests). Being honest and specific is what scores the 10%.
- **`SECURITY.md`** (threat model + mitigations), **`TESTING.md`** (strategy, how to run, coverage), **`DEMO_SCRIPT.md`** (5-minute jury walkthrough + Q&A prep).

---

## Suggested execution order
1. P0 #1–#4, S1–S3 (bugs + the claims the docs get wrong), each with tests written first.
2. Test infrastructure: restructure, coverage, integration DB, CI.
3. Remaining P0 (#5–#10) + S4–S10.
4. UI/UX pass (citizen mobile first, then dispatcher) + Playwright e2e on the final UI.
5. Architecture cleanup (AppError, event bus, TrafficProvider, lint).
6. Docs last, reflecting the real final state (README, docx, AI declaration, traceability matrix, demo script).

Keep about 20 minutes of buffer in each hour for the next Challenge Drop.
