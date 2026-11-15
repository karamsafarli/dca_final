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

## Növbəti drop-lar üçün hazırlıq
- Hədlər `config/constants.js`-də (bir sətir dəyişiklik).
- Yeni xarici asılılıq → eyni `CircuitBreaker` sinfi ilə bükülür.
- Yeni rol/kateqoriya → `citizenCategory` enum + marşrut məhdudiyyəti (`accessibleOnly` nümunəsi).
- Yeni hadisə → `realtime/events.js` kataloquna bir funksiya; PII qaydası orada sənədləşdirilib.
