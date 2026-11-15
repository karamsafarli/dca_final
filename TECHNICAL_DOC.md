# Texniki İzah Sənədi — Urban Crisis & Crowd Evacuation Engine

## 1. Problemin Həlli Yanaşması

Fövqəladə hallar zamanı əsas iki problem mövcuddur:
1. **Vətəndaş tərəfində məlumat boşluğu:** Sakinlər hansı toplanış məntəqəsinin dolduğunu və ya hansı prospektin bağlandığını görmədiyi üçün eyni nöqtəyə axışır və çıxış yollarında tıxac yaranır.
2. **Dispetçer tərəfində siqnal yükü:** Çoxsaylı SOS çağırışları arasında hansı ərazidə böhranın kritikləşdiyini vaxtında ayırd etmək və ehtiyat resursları dərhal yönləndirmək çətindir.

### Tətbiq Edilən Həll:
- **Dinamik Qraf Əsaslı Marşrutlaşdırma (Modul 1):** Bakı şəhərinin 5 rayonu üzrə qovşaqlar (`RoadNode`) və prospekt/küçə seqmentləri (`RoadSegment`) qraf şəklində modelləşdirilib. Vətəndaş mövqeyini (rayon seçimi, xəritədən klik və ya GPS) bildirdikdə Dijkstra alqoritmi `OPEN` yollarla ən qısa təhlükəsiz yolu hesablayır. Hər hansı yol `CLOSED` statusuna keçdikdə VƏ YA hədəf məntəqənin doluluğu **90%-ə** çatdıqda, sistem avtomatik olaraq alternativ açıq yol və ya növbəti uyğun toplanış məntəqəsini seçir və bunu `Socket.IO` ilə canlı yeniləyir.
- **Kritik Böhran Alqoritmi və 1-Klik İcra (Modul 2):** Hər yeni SOS siqnalı və məntəqə doluluğu dəyişikliyi zamanı arxa planda avtomatik analiz işə düşür:
  - Son **5 dəqiqə** ərzində eyni zonada **VƏ YA 500 metr radiusda** ən azı **4 fərqli aktiv SOS siqnalı** daxil olarsa;
  - **VƏ YA** hər hansı toplanış məntəqəsinin doluluğu **95%-i keçərsə**;
  dispetçer panelində avtomatik olaraq **"Qırmızı Həyəcan: Əlavə xilasetmə briqadası göndər və yeni toplanış nöqtəsi aç"** xəbərdarlığı yaranır. Dispetçer 1 kliklə təsdiq verdikdə atomik verilənlər bazası tranzaksiyası ilə həm əlavə briqada zonaya yönləndirilir, həm də ehtiyat toplanış məntəqəsi aktivləşdirilir.
- **Xüsusi Qayğı / Əlil Arabası Marşrutlaşdırması və Prioritet #1 SOS (Challenge Drop #1):**
  - `RoadSegment` və `AssemblyPoint` modellərinə `isWheelchairAccessible` (`Boolean`) sahəsi, `SosSignal` modelinə isə `citizenCategory` (`STANDARD | SPECIAL_CARE`) və `priorityLevel` (`Int`, kompozit indeks `[priorityLevel, createdAt]`) sahələri əlavə edilmişdir.
  - `SPECIAL_CARE` profili ilə göndərilən SOS siqnalı avtomatik `priorityLevel = 1` alır, dispetçer siyahısında prioritetləşdirilir (`ORDER BY priority_level ASC, created_at DESC`) və `routingService.js` Dijkstra qraf axtarışında pilləkənli/pandussuz yolları (`!road.isWheelchairAccessible`) və əlçatmaz sığınacaqları filtrdən çıxarır.
- **Dinamik i18n (`AZ` / `EN`):** React Context (`I18nContext`) və `localStorage` əsaslı tərcümə sistemi bütün komponentlərə tətbiq olunmuşdur.

- **Xarici Marşrut API-si Çöküşünə Davamlılıq (Challenge Drop #2):** Marşrut hesablamaları `RoutingGateway` vasitəsilə xarici xəritə/marşrut API-sinə (ayrı konteynerdə simulyasiya olunur) göndərilir. Hər çağırış 5 saniyəlik timeout-lu **Circuit Breaker** ilə qorunur (3 ardıcıl xəta → `OPEN`, 20 s sonra `HALF_OPEN` sınağı). Xəta, `HTTP 503`, timeout və ya yanlış cavab zamanı sistem exception atmır və ardıcıl olaraq: (1) eyni yol vəziyyəti üçün **son keşlənmiş xarici marşrutlar**, (2) **lokal ehtiyat yol qrafı** üzərində Dijkstra, (3) qraf yoxdursa **statik koordinat matrisi** (haversine) ilə cavab verir. Vətəndaşa "Oflayn / Ehtiyat marşrut rejimində işləyir" paneli göstərilir; health probe xidmət bərpa olunduqda avtomatik onlayn rejimə qaytarır.

---

## 2. Seçilmiş Texnologiyalar və Əsaslandırma

| Texnologiya | Rolu | Seçim Səbəbi |
|---|---|---|
| **React 18 + Vite + Tailwind CSS** | Frontend UI | Sürətli komponent yığımı, mobilə uyğun (`mobile-first`) yüksək kontrastlı fövqəladə idarəetmə interfeysi. |
| **Leaflet (`react-leaflet`)** | İnteraktiv Xəritə | Ödənişli API açarlarından asılı olmadan OpenStreetMap üzərində polixətlər, radius dairələri və canlı markerlərin çəkilməsi. |
| **Node.js 24 + Express** | Backend API | Asinxron I/O performansı, müasir ESM dəstəyi və yüngül servis arxitekturası. |
| **Prisma ORM + PostgreSQL 16** | Verilənlər Bazası Qatı | Tip-təhlükəsiz sxem idarəetməsi, əlaqəli cədvəllər (`Zone`, `RoadNode`, `RoadSegment`, `AssemblyPoint`, `SosSignal`, `SafetyCheckIn`, `RescueBrigade`, `CriticalAlert`, `Dispatcher`), atomik `$transaction` və Challenge Drop zamanı sürətli sxem yenilənməsi. |
| **Socket.IO** | Real-Time Kommunikasiya | Yol bağlanması, yeni SOS və Qırmızı Həyəcan hadisələrinin millisaniyələr içində bütün Vətəndaş və Dispetçer ekranlarına çatdırılması. |
| **Vitest + Supertest + Testing Library** | Avtomatlaşdırılmış Testlər | 62 unit + 36 inteqrasiya (real PostgreSQL, HTTP, Socket.IO) + 19 frontend testi; backend coverage 91.6% (CI-da minimum hədlər). Ətraflı: `TESTING.md`. |
| **GitHub Actions** | CI | Hər push-da unit → inteqrasiya (Postgres servisi) → coverage → frontend test/build → Docker build. |
| **Docker & Docker Compose** | Konteynerləşdirmə | PostgreSQL 16, Node.js 24 Backend və Nginx/React Frontend xidmətlərinin tək əmrlə tam təkrarlanabilən şəkildə işə salınması. |

---

## 3. Təhlükəsizlik və Performans Tədbirləri

### Təhlükəsizlik:
Tam təhdid modeli: `SECURITY.md`. Hər bənd avtomatlaşdırılmış testlə yoxlanılır.
- **Dispetçer autentifikasiyası:** `/api/dispatcher/*`, yol statusu dəyişikliyi və `/api/simulation/*` `requireDispatcherAuth` ilə qorunur (`401 AUTH_REQUIRED`). Parollar `scrypt` + fərdi salt + `timingSafeEqual`. JWT (`HS256`, 8 saat) **yalnız** `HttpOnly`, `SameSite=Lax` cookie-də saxlanılır — login cavabının gövdəsində qaytarılmır.
- **SOS sahibliyi (IDOR qorunması):** hər SOS üçün birdəfəlik təsadüfi `accessToken` (192 bit) verilir, bazada yalnız SHA-256 heşi saxlanılır və heç bir API cavabında görünmür (Prisma `omit`). "Təhlükəsizəm" və şəxsi Socket.IO kanalı yalnız bu tokenlə işləyir.
- **Şəxsi məlumatların (PII) təcridi:** ad, telefon, dəqiq koordinat və qeydlər yalnız autentifikasiyalı `dispatchers` Socket.IO otağına göndərilir; vətəndaş yalnız öz SOS-unun PII-siz statusunu alır; ictimai kanalda yalnız ID və səbəb kodları var.
- **Sui-istifadəyə qarşı limitlər:** dəqiqədə 10-dan çox SOS və 15 dəqiqədə 10 uğursuz giriş → `429 RATE_LIMITED` (`express-rate-limit`, nginx arxasında real IP üçün `trust proxy`). Qırmızı Həyəcan isə yalnız 4 **fərqli** vətəndaşın SOS-u ilə yaranır — bir cihaz saxta həyəcan yarada bilməz.
- **CORS:** açıq allow-list (`FRONTEND_ORIGIN`); `*` qəbul edilmir, çünki `credentials: true` ilə istənilən sayta dispetçer adından sorğu imkanı verərdi.
- **Giriş validasiyası (`zod`):** body, query və path parametrləri; yanlış dəyər `400 VALIDATION_ERROR`. Xarici marşrut API-sinin cavabı da sxemlə yoxlanılır. 500 xətalarında daxili mesaj gizlədilir.
- **Eyni anda əməliyyatlar (race condition):** həyəcan yaradılması zona/məntəqə üzrə PostgreSQL advisory lock ilə, icra isə `SELECT … FOR UPDATE` ilə seriallaşdırılır; briqada və ehtiyat məntəqə şərti `updateMany` ilə atomik tutulur. Nəticə: iki dispetçer eyni anda kliklədikdə yalnız bir briqada göndərilir (inteqrasiya testi ilə sübut olunub).
- **Audit izi:** icra və rədd edilən həyəcanlarda operatorun ID/nişan kodu və vaxtı saxlanılır.
- **Konteynerlər:** backend root olmayan `node` istifadəçisi ilə işləyir, healthcheck-lər var, PostgreSQL portu yalnız `127.0.0.1`-ə açılır; `X-Powered-By` söndürülüb, `helmet` başlıqları aktivdir.
- **Xarici asılılıqlara dayanıqlılıq:** Circuit Breaker + Fallback (Challenge Drop #2); keş yol vəziyyəti heşi ilə etibarsızlaşdırılır — bağlanmış yoldan keçən köhnə marşrut verilmir.

### Performans:
- **Verilənlər Bazası İndeksləri:** `sos_signals(zone_id, created_at)`, `sos_signals(citizen_status, created_at)`, `road_segments(status)`, `critical_alerts(status, created_at)` üzrə kompozit indekslər 5 dəqiqəlik vaxt pəncərəsi sorğularını sürətləndirir.
- **Yüngül Yaddaşdaxili Qraf Həllçisi:** Təxliyə marşrutları DB-dən paralel (`Promise.all`) çəkilən qovşaq və yollar üzərində millisaniyələr içində hesablanır.
- **Real-Time Event Push:** Frontend polling etmir. Vətəndaş ekranı yalnız marşrutu dəyişə bilən 6 hadisə növündə (yol, doluluq, həyəcan icrası, marşrut rejimi, reset) və 400 ms debounce ilə yenilənir — başqa vətəndaşların SOS-ları minlərlə ekranda təkrar hesablama yaratmır.
- **Circuit Breaker:** xarici API çökəndə istifadəçilər 5 saniyə gözləmir — circuit açıq olduqda cavab ~5 ms-də lokal ehtiyatdan verilir.

---

## 4. Əsas Arxitektura Qərarları (ADR qısa)

| Qərar | Alternativ | Səbəb |
|---|---|---|
| Yaddaşdaxili Dijkstra (DB-dən yüklənmiş qraf) | PostGIS / pgRouting | Prototip ölçüsündə (~20 qovşaq) millisaniyələr; quraşdırma tələb etmir. Böyük şəhər üçün PostGIS yolu açıqdır. |
| Qərar məntiqi marşrut mənbəyindən ayrıdır (`rankEvacuationOptions`) | Hər yerdə birbaşa Dijkstra | Challenge Drop #2-də onlayn/oflayn rejimdə eyni 90%/bağlı yol/əlçatanlıq qaydaları — tək test olunan funksiya. |
| Öz Circuit Breaker sinfimiz | `opossum` kitabxanası | ~150 sətir, sınaq saatı (fake clock) ilə tam test olunur, əlavə asılılıq yoxdur. |
| Xarici marşrut API-si ayrıca konteynerdə | Prosesdaxili mock | Çöküş real şəbəkə xətasıdır (503, timeout, connection refused) — demo və testlər realdır. |
| Socket.IO otaqları (`dispatchers`, `sos:<id>`) | Hamıya yayım | PII yalnız səlahiyyətli operatorlara çatır. |
| JWT HttpOnly cookie-də | `localStorage` | XSS zamanı token oğurlana bilmir. |
| Hədlər `config/constants.js`-də | Kodda səpələnmiş rəqəmlər | Yeni challenge drop-da həddin dəyişməsi bir sətirdir; testlər dəqiq dəyərləri yoxlayır. |

---

## 5. Məlum Məhdudiyyətlər (dürüst qiymətləndirmə)

- Sxem `prisma db push` ilə tətbiq olunur; istehsal üçün `prisma migrate` tarixçəsi lazımdır.
- Rate-limit və marşrut keşi proses yaddaşındadır — çox instansiyalı yerləşdirmədə Redis (və Socket.IO Redis adapter) lazımdır.
- Yol seqmentlərinin həndəsəsi sadələşdirilib (qovşaqlar arası xətt); real küçə həndəsəsi OSRM ixracı ilə əlavə oluna bilər.
- Simulyasiya olunmuş xarici API yol məlumatını eyni bazadan oxuyur (real provayder öz məlumatına malikdir).
- `npm audit`: `zod` 3 (major yeniləmə tələb edir) və Prisma alətlərindəki `deepmerge-ts` — təsir və azaltma tədbirləri `TESTING.md`-də.
- Brauzer e2e testləri (Playwright) vaxt səbəbindən əlavə olunmayıb; axınlar API + Socket.IO səviyyəsində test olunur.

---

## 6. Gələcək İnkişaf İmkanları

1. **PostGIS İnteqrasiyası:** Böyük meqapolislər (yüz minlərlə qovşaq və milyonlarla aktiv vətəndaş) üçün `ST_DWithin` məkan indekslərinə keçid.
2. **Real Yol-Nəqliyyat API-si (OSRM / Google Maps / Waze):** Şəhər kameraları və tıxac sensorlarından gələn canlı axınların `RoadSegment.status` dəyərlərinə avtomatik bağlanması.
3. **Rol Əsaslı Autentifikasiya (JWT + RBAC):** FHN/112 operatorları üçün xüsusi rəqəmsal imza / 2FA girişi və vətəndaşlar üçün SİMA/ASAN Login inteqrasiyası.
4. **Offline-First PWA & SMS Fallback:** Zəlzələ zamanı internet kəsildikdə vətəndaşların son keşlənmiş sığınacaq xəritəsini oflayn görməsi və SOS-un SMS/USSD kanalına yönləndirilməsi.
5. **Qabaqcıl Analitika və Təxliyə Proqnozlaşdırması:** Məntəqə doluluğunun neçə dəqiqə sonra 90%-ə çatacağını proqnozlaşdıran zaman-sıralı model.
