# Challenge Drop-lara Uyğunlaşma Jurnalı

Hər drop üçün: tələb, dizayn qərarı, dəyişən fayllar, testlər və necə nümayiş etdirmək.

---

## Drop #1 — Hərəkət məhdudiyyətli vətəndaş (Prioritet SOS) + AZ/EN i18n

**Tələb:** Xüsusi qayğıya ehtiyacı olan vətəndaşın SOS-u avtomatik *Kritik Prioritet (#1)* almalı, ona yalnız əlil arabası / tibbi nəqliyyat üçün əlçatan (panduslu, maneəsiz) marşrut təyin edilməli; bütün interfeys AZ və EN arasında dinamik dəyişməlidir.

**Dizayn qərarları**
- Sxem: `SosSignal.citizenCategory` (`STANDARD | SPECIAL_CARE`), `priorityLevel`, `RoadSegment/AssemblyPoint.isWheelchairAccessible`.
- Marşrut: Dijkstra `accessibleOnly` rejimində pilləkənli yolları və əlçatmaz məntəqələri qrafdan çıxarır; qərar məntiqi hansı məntəqənin niyə keçildiyini (`ACCESSIBILITY_REQUIRED`) izah edir.
- Heç bir maneəsiz marşrut yoxdursa boş ekran yox: "Maneəsiz marşrut tapılmadı" paneli + 1 kliklə tibbi nəqliyyat tələbi (`needsTransport` → Prioritet #1).
- Dispetçer: prioritet SOS-lar siyahının başında, vizual bildiriş (toast); briqada seçimində MEDICAL bölmələrə üstünlük.
- i18n: React Context + `localStorage`; backend xətaları sabit `code` qaytarır və klientdə tərcümə olunur; həyəcan mətnləri strukturlaşdırılmış sahələrdən qurulur (serverdə saxlanmış AZ mətni göstərilmir).

**Fayllar:** `prisma/schema.prisma`, `services/routingService.js`, `services/evacuationService.js`, `services/sosService.js`, `services/brigadeAllocation.js`, `frontend/src/i18n/*`, `components/citizen/CitizenRoleSelector.jsx`, `EvacuationRouteCard.jsx`.

**Testlər:** `unit/crisisAndRouting.test.js` (maneəsiz marşrut, `NO_ACCESSIBLE_ROUTE`), `unit/crisisRules.test.js` (MEDICAL briqada üstünlüyü), `integration/citizenSafety.int.test.js` (`needsTransport` → prioritet 1), `frontend translations.test.js` (AZ = EN açarları və dəyişənləri), `EvacuationRouteCard.test.jsx`, `api.test.js`.

**Demo:** Vətəndaş → "Hərəkət Məhdudiyyətli / Xüsusi Qayğı" seçin → marşrut pilləkənli yolu keçir; SOS göndərin → dispetçer siyahısının başında "Prioritet #1". Naviqasiyada `AZ | EN`.

---

## Drop #2 — Xarici Xəritə və Marşrut API-si sıradan çıxdı (503 / > 5 s)

**Tələb:** Sistem çökməməli, Circuit Breaker / Fallback avtomatik işə düşməli, hesablamalar lokal ehtiyatdan (statik koordinat matrisi və ya son keşlənmiş marşrutlar) aparılmalı və istifadəçiyə "Oflayn / Ehtiyat marşrut rejimində işləyir" bildirişi göstərilməlidir.

**Dizayn qərarları**
- Xarici provayder ayrıca konteynerdə (`routing-api`) — çöküşlər real şəbəkə xətalarıdır. Rejimlər: `HEALTHY`, `DOWN` (503), `SLOW` (7 s).
- `CircuitBreaker`: 5 s timeout (+ `AbortController`), 3 ardıcıl xəta → `OPEN`, 20 s sonra `HALF_OPEN` (1 sınaq zəngi).
- `RoutingGateway` heç vaxt exception atmır; ehtiyat ardıcıllığı: **keş → lokal yol qrafı (Dijkstra) → statik koordinat matrisi (haversine)**.
- Keşin açarı yolların cari vəziyyətinin heşini ehtiva edir — bağlanmış yoldan keçən köhnə marşrut heç vaxt verilmir.
- Qərar qaydaları (90%, bağlı yol, əlçatanlıq) marşrut mənbəyindən asılı deyil — oflayn rejimdə də eynidir.
- `routing:status` Socket.IO hadisəsi + arxa plan health probe: bərpa istifadəçi trafiki olmadan da avtomatikdir.
- `/api/health` provayder çökəndə `degraded` qaytarır, `/api/routing/status` circuit vəziyyətini göstərir.

**Fayllar:** `backend/src/resilience/{circuitBreaker,routeCache}.js`, `integrations/routingApiClient.js`, `services/routingGateway.js`, `external/{mockRoutingApi,routingApiServer}.js`, `services/evacuationService.js`, `docker-compose.yml`, `frontend/src/components/citizen/RoutingModeBanner.jsx`, `components/dispatcher/SimulationBar.jsx`.

**Testlər:** `unit/circuitBreaker.test.js` (8), `unit/routingGateway.test.js` (10), `integration/routingResilience.int.test.js` (8: 503, timeout, keş, circuit open, bağlantı kəsilməsi, bərpa, icazə), `unit/thresholds.test.js` (5000 ms default), `RoutingModeBanner.test.jsx`.

**Ölçülmüş nəticələr:** konteyner dayandırıldıqda bütün sorğular `HTTP 200`; circuit açıq olduqda cavab ~5 ms; `SLOW` rejimində sorğu 5.03 s-də kəsilib keşdən cavablandı; bərpa health probe ilə avtomatik.

**Demo:** Dispetçer → "Demo ssenariləri" → `API: 503` (və ya `docker compose stop routing-api`) → vətəndaş ekranında sarı oflayn panel, marşrut davam edir → `API: Bərpa et` → panel yox olur.

---

## Drop #3 — SOS flood / spam hücumu (500+ eyni anda), RBAC, < 300 ms

**Tələb:** rate limiting + dublikat filtrasiyası (saxta sorğular dispetçer panelini bloklamamalı), briqada yönləndirmənin JWT / RBAC ilə qorunması, kütləvi sorğularda orta gecikmə < 300 ms.

**Əvvəlcə ölçdük** (`loadtest/sosFlood.js`): 600 eyni anda SOS → orta **1526 ms**; dublikat fırtınası **355 təkrar qeyd və 245 HTTP 500** (Prisma `P2028`: hər SOS zona lock-unu gözləyən tranzaksiyada pool bağlantısını tutur → pool tükənir); dispetçer paneli p95 2.2 s. Rate limiting tək mənbəni artıq kəsirdi.

**Dizayn qərarları**
- **Çoxqatlı rate limit:** nginx `limit_req` (2 r/s, burst 10) + `express-rate-limit` (10/dəq). nginx `X-Forwarded-For`-u üzərinə yazır, backend portu `127.0.0.1`-ə bağlıdır → IP saxtalaşdırması ilə limitdən yayınmaq olmur.
- **Dublikat filtri:** açar = vətəndaş + təhlükə növü (2 dəq). Eyni anda gələnlər `singleFlight` ilə bir əməliyyata birləşir; sonrakılar mövcud SOS-u qaytarır (`200 duplicate:true`, token yalnız yaradana). Yaddaşdaxili indeks yeni vətəndaşlar üçün DB sorğusunu atlayır; restartdan sonra 2 dəq DB yoxlanılır.
- **Coalesced böhran qiymətləndirməsi:** zona üzrə 1 işləyən + 1 növbədə; növbədəki run əvvəl commit olunmuş bütün siqnalları görür → nəticə eynidir, iş 500 → ~2. Xəta SOS-u itirmir.
- **Gecikmə büdcəsi (30 ms):** cavab qiymətləndirməni yalnız büdcə daxilində gözləyir; Qırmızı Həyəcan hər halda Socket.IO ilə çatır (yük testindən sonra hər zonada 1 həyəcan yarandığı yoxlanıldı).
- **Hot path optimallaşdırması:** zona keşi, `create` zamanı əlavə JOIN-lərin aradan qaldırılması, Prisma pool 40, istehsalda yalnız xətaların loglanması.
- **Panel bloklanmır:** dispetçer yenilənməsi throttle (1/s, trailing), bildirişlər toplanır, ictimai `state:updated` 500 ms paketlərlə; App səviyyəsində hər hadisədə tam dashboard sorğusu silindi.
- **RBAC:** `OBSERVER` / `DISPATCHER` / `COMMANDER` icazə matrisi (`config/permissions.js`), `requirePermission` hər kritik route-da, rol hər sorğuda bazadan, JWT `iss`/`aud`, `403 FORBIDDEN` + audit log; UI icazələrə görə düymələri gizlədir; sistem sıfırlama yalnız COMMANDER.
- **Müşahidə edilə bilən SLO:** `Server-Timing` başlığı, `GET /api/metrics/latency`, konsolda canlı gecikmə göstəricisi.

**Fayllar:** `frontend/nginx.conf`, `docker-compose.yml`, `backend/src/resilience/coalesce.js`, `services/sosService.js`, `services/zoneCache.js`, `services/crisisEngineService.js`, `realtime/events.js`, `config/permissions.js`, `middleware/authMiddleware.js`, `middleware/latencyMetrics.js`, `routes/*`, `prisma/schema.prisma` (`OBSERVER`, indeks), `loadtest/sosFlood.js`, `frontend/src/lib/throttle.js`, `pages/DispatcherPage.jsx`, `KpiStatsGrid.jsx`.

**Testlər:** `integration/sosFlood.int.test.js` (600 eyni anda SOS: 0 xəta, server orta < 300 ms, zona başına 1 həyəcan; 500 dublikat → 1 qeyd; isti indeks yolu; daşqın zamanı briqada göndərmə), `integration/rbac.int.test.js` (observer 6 kritik əməliyyatda 403, rol bazadan, deaktiv hesab), `unit/floodProtection.test.js`, `frontend lib/throttle.test.js`, `SosFeedList.test.jsx`, `RedAlertBanner.test.jsx`.

**Ölçülmüş nəticə** (isinmədən sonra, Docker şəbəkəsi, 3 ardıcıl run): botnet orta **252 / 166 / 141 ms**, server tərəfi ~40 ms; dublikat fırtınası 1 qeyd; tək mənbə 590–600 × 429; dashboard ~25–45 ms; briqada göndərmə 4–6 ms. Qeyd: ilk soyuq run (JIT isinmədən) 312 ms idi — buna görə yük testinə standart isinmə fazası əlavə olundu.

**Demo:** Dispetçer → "Demo ssenariləri" yox, terminaldan `cd backend && npm run loadtest` → konsolda "SOS API gecikməsi" göstəricisi və toplanmış bildirişlər; `observer` ilə daxil olub "Yalnız baxış rejimi"-ni göstərin.

---

## Növbəti drop-lar üçün hazırlıq
- Hədlər `config/constants.js`-də (bir sətir dəyişiklik).
- Yeni xarici asılılıq → eyni `CircuitBreaker` sinfi ilə bükülür.
- Yeni rol/kateqoriya → `citizenCategory` enum + marşrut məhdudiyyəti (`accessibleOnly` nümunəsi).
- Yeni hadisə → `realtime/events.js` kataloquna bir funksiya; PII qaydası orada sənədləşdirilib.
