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
| **Prisma ORM + PostgreSQL 16** | Verilənlər Bazası Qatı | Tip-təhlükəsiz sxem idarəetməsi, əlaqəli cədvəllər (`Zone`, `RoadNode`, `RoadSegment`, `AssemblyPoint`, `SosSignal`, `RescueBrigade`, `CriticalAlert`), atomik `$transaction` və Challenge Drop zamanı sürətli sxem yenilənməsi. |
| **Socket.IO** | Real-Time Kommunikasiya | Yol bağlanması, yeni SOS və Qırmızı Həyəcan hadisələrinin millisaniyələr içində bütün Vətəndaş və Dispetçer ekranlarına çatdırılması. |
| **Vitest + Supertest** | Avtomatlaşdırılmış Testlər | Alqoritm hədlərinin (500m, 90%, 95%) və HTTP validasiyasının sürətli avtomatik yoxlanışı. |
| **Docker & Docker Compose** | Konteynerləşdirmə | PostgreSQL 16, Node.js 24 Backend və Nginx/React Frontend xidmətlərinin tək əmrlə tam təkrarlanabilən şəkildə işə salınması. |

---

## 3. Təhlükəsizlik və Performans Tədbirləri

### Təhlükəsizlik:
- **Dispetçer Autentifikasiyası və Səlahiyyət Nəzarəti:** Bütün dispetçer (`/api/dispatcher/*`), yol statusu dəyişikliyi (`PATCH /api/traffic/roads/:id/status`) və simulyasiya (`/api/simulation/*`) endpoint-ləri `requireDispatcherAuth` middleware-i ilə qorunur; icazəsiz sorğular `HTTP 401` ilə bloklanır.
- **Kriptoqrafik Parol və JWT Qoruması:** Dispetçer parolları `crypto.scryptSync` (16 bayt təsadüfi salt + `timingSafeEqual`) ilə saxlanılır; sessiya `HttpOnly`, `SameSite=Lax` JWT (`HS256`) cookie-si üzərindən idarə olunur.
- **Brute-Force Mühafizəsi & Audit İzi:** Giriş endpoint-ində uğursuz cəhdlər üzrə IP əsaslı məhdudlaşdırma (`HTTP 429`) tətbiq olunur və icra edilən Qırmızı Həyəcan qərarlarında operatorun ID/nişan kodu (`executedByDispatcherId`) saxlanılır.
- **WebSocket Kanal Təcridi:** Yalnız etibarlı JWT ilə qoşulan dispetçer soketləri `dispatchers` otağına daxil edilir; vətəndaşların şəxsi SOS detalları ictimai kanala yayımlanmır.
- **Giriş Validasiyası (`Zod`):** Bütün POST/PATCH sorğuları (`hazardType`, koordinat aralığı `-90..90`, doluluq faizi və s.) şema səviyyəsində yoxlanılır; yanlış məlumatlar `HTTP 400` ilə rədd edilir.
- **SQL Injection Mühafizəsi:** Prisma ORM bütün sorğuları parametrləşdirilmiş şəkildə icra edir.
- **HTTP Başlıq Təhlükəsizliyi (`helmet`) və CORS:** Server cavabları `helmet` təhlükəsizlik başlıqları və konfiqurasiya olunan `CORS` (`credentials: true`) siyasəti ilə qorunur.
- **Tranzaksiya Bütövlüyü:** Qırmızı Həyəcan icrası (`executeCriticalAlert`) və briqada təyinatı `prisma.$transaction` daxilində atomik aparılır — eyni anda iki dispetçer klikləsə belə ikiqat briqada göndərilməsinin qarşısı alınır (idempotentlik).

- **Xarici Asılılıqlara Qarşı Dayanıqlılıq:** Circuit Breaker + Fallback (bax: Challenge Drop #2), xarici API cavabının `zod` sxem yoxlaması, keşin yol vəziyyəti hash-i ilə etibarsızlaşdırılması (bağlanmış yoldan keçən köhnə marşrut verilmir).

### Performans:
- **Verilənlər Bazası İndeksləri:** `sos_signals(zone_id, created_at)`, `sos_signals(citizen_status, created_at)`, `road_segments(status)`, `critical_alerts(status, created_at)` üzrə kompozit indekslər 5 dəqiqəlik vaxt pəncərəsi sorğularını sürətləndirir.
- **Yüngül Yaddaşdaxili Qraf Həllçisi:** Təxliyə marşrutları DB-dən paralel (`Promise.all`) çəkilən qovşaq və yollar üzərində millisaniyələr içində hesablanır.
- **Real-Time Event Push:** Frontend davamlı polling etmir; yalnız `Socket.IO` hadisələri gəldikdə yenilənir.

---

## 4. Gələcək İnkişaf İmkanları

1. **PostGIS İnteqrasiyası:** Böyük meqapolislər (yüz minlərlə qovşaq və milyonlarla aktiv vətəndaş) üçün `ST_DWithin` məkan indekslərinə keçid.
2. **Real Yol-Nəqliyyat API-si (OSRM / Google Maps / Waze):** Şəhər kameraları və tıxac sensorlarından gələn canlı axınların `RoadSegment.status` dəyərlərinə avtomatik bağlanması.
3. **Rol Əsaslı Autentifikasiya (JWT + RBAC):** FHN/112 operatorları üçün xüsusi rəqəmsal imza / 2FA girişi və vətəndaşlar üçün SİMA/ASAN Login inteqrasiyası.
4. **Offline-First PWA & SMS Fallback:** Zəlzələ zamanı internet kəsildikdə vətəndaşların son keşlənmiş sığınacaq xəritəsini oflayn görməsi və SOS-un SMS/USSD kanalına yönləndirilməsi.
5. **Qabaqcıl Analitika və Təxliyə Proqnozlaşdırması:** Məntəqə doluluğunun neçə dəqiqə sonra 90%-ə çatacağını proqnozlaşdıran zaman-sıralı model.
