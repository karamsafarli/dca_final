# Urban Crisis & Crowd Evacuation Engine

Fövqəladə hallar (zəlzələ, güclü sel, yanğın, sənaye qəzaları və kütləvi tədbirlər) zamanı vətəndaşların ən yaxın təhlükəsiz toplanış məntəqələrinə dinamik yönləndirilməsi və dispetçer mərkəzinin böhran koordinasiyası üçün hazırlanmış real-vaxt mikro-sistem.

---

## 1. Sistem Arxitekturası və Məlumat Axını (Architecture & Data Flow)

```mermaid
flowchart LR
    subgraph Frontend ["Frontend (React 18 + Vite + Tailwind + Leaflet + Nginx)"]
        M1["Modul 1: Vətəndaş Təhlükəsizlik Paneli (/)"]
        M2["Modul 2: Dispetçer & Analitika Paneli (/dispatcher)"]
    end

    subgraph Backend ["Backend (Node.js 24 + Express + Prisma ORM + Socket.IO)"]
        REST["REST API & Zod Validasiya"]
        TRAFFIC["Simulyasiya Edilmiş Yol-Nəqliyyat API-si"]
        ROUTER["Dijkstra Marşrutlaşdırma & Rerouting Mühərriki"]
        CRISIS["Kritik Böhran Alqoritmi (4 SOS / 500m / 5 dəq və >95%)"]
        WS["Socket.IO Real-Time Hub"]
    end

    subgraph DB ["Verilənlər Bazası (PostgreSQL 16)"]
        PG[("zones, road_nodes, road_segments,\nassembly_points, sos_signals,\nrescue_brigades, critical_alerts")]
    end

    M1 <-->|"HTTP /api/* + WebSocket"| REST
    M2 <-->|"HTTP /api/* + WebSocket"| REST
    REST --> TRAFFIC
    REST --> ROUTER
    REST --> CRISIS
    TRAFFIC --> PG
    ROUTER --> PG
    CRISIS --> PG
    CRISIS -->|"alert:created / alert:executed"| WS
    TRAFFIC -->|"road:updated / state:updated"| WS
    WS --> M1
    WS --> M2
```

### API və Servis Axını:
1. **Vətəndaş Təxliyə Sorğusu (`GET /api/citizen/evacuation-plan`):**
   - İstifadəçinin seçdiyi rayon (`zoneId`) və ya koordinat (`lat`, `lng`) ən yaxın açıq yol qovşağına bağlanır.
   - `routingService.js` Dijkstra alqoritmi ilə `OPEN` və `CONGESTED` yol seqmentləri üzərindən bütün aktiv toplanış məntəqələrinə qısa yolu hesablayır (`CLOSED` yollar avtomatik kənarlaşdırılır).
   - `evacuationService.js` məntəqə doluluğu `>= 90%` olduqda və ya əsas yol bağlandıqda avtomatik olaraq növbəti təhlükəsiz məntəqəni və alternativ marşrutu təklif edir.
2. **SOS və Kritik Böhran Axını (`POST /api/citizen/sos`):**
   - Vətəndaşın SOS siqnalı (`FIRE`, `COLLAPSE`, `FLOOD`, `MEDICAL`) PostgreSQL-ə yazılır və `Socket.IO` ilə dispetçer panelinə ötürülür.
   - `crisisEngineService.js` son 5 dəqiqədə eyni zonada və ya 500 metr radiusda **ən azı 4 aktiv SOS siqnalı** olub-olmadığını yoxlayır. Şərt ödənərsə (və ya məntəqə doluluğu **95%-i keçərsə**), avtomatik **Qırmızı Həyəcan** yaradılır.
3. **Bir Kliklə Qərar İcrası (`POST /api/dispatcher/alerts/:id/execute`):**
   - Prisma `$transaction` daxilində: (a) mövcud/ehtiyat xilasetmə briqadası zonaya `DISPATCHED` edilir, (b) ehtiyat `STANDBY` toplanış məntəqəsi `OPEN` statusuna keçirilir (yoxdursa mobil məntəqə yaradılır), (c) xəbərdarlıq `EXECUTED` kimi bağlanır və bütün müştərilər canlı yenilənir.

---

## 2. İşə Salınma Təlimatı (Local & Docker Setup)

### Variant A: Docker Compose ilə (Tövsiyə olunan — 1 əmrlə)
**Tələblər:** Docker və Docker Compose

```bash
docker compose up --build -d
```

Xidmətlər işə düşdükdə Backend avtomatik olaraq Prisma sxemini PostgreSQL bazasına tətbiq edir (`prisma db push`) və Bakı şəhərinin 5 rayonu üzrə ilkin məlumatları (`zones`, `road_nodes`, `road_segments`, `assembly_points`, `rescue_brigades`) bazaya yükləyir.

- **Vətəndaş Paneli (Modul 1):** http://localhost:3000/
- **Dispetçer Paneli (Modul 2):** http://localhost:3000/dispatcher
- **Backend API & Healthcheck:** http://localhost:4050/api/health

Dayandırmaq üçün:
```bash
docker compose down
```

### Variant B: Hibrid Rejim (Backend + DB Docker-də, Frontend Local HMR ilə — İnkişaf üçün)
UI dəyişikliklərini real vaxtda görmək üçün:
```bash
docker compose up -d --build postgres backend
cd frontend && npm install && npm run dev
```
Brauzerdə açın: http://localhost:5173 (Vite proksisi `/api` və `/socket.io`-nu avtomatik `http://localhost:4050` ünvanına yönləndirir).

### Variant C: Tam Local Runtime ilə (Node.js 24 + PostgreSQL 16)
**Tələblər:** Node.js `v24.x` (`v24.22.1` ilə test edilib) və aktiv PostgreSQL 16 bazası

1. **Verilənlər bazasını işə salın** (məsələn, yalnız Postgres konteynerini qaldıra bilərsiniz):
   ```bash
   docker compose up -d postgres
   ```
2. **Backend-i quraşdırın və işə salın:**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   npm run dev
   ```
3. **Frontend-i quraşdırın və işə salın:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Brauzerdə açın: http://localhost:5173

---

## 3. Testlərin İcra Olunması (Testing)

Backend-in marşrutlaşdırma, 90%/95% doluluq hədləri, 500m radiusda 4 SOS klasterləşməsi və API validasiyası üzrə avtomatlaşdırılmış testlərini icra etmək üçün:

```bash
cd backend
npm test
```

---

## 4. Dinamik Texniki Şərtlərə (Challenge Drop) Uyğunlaşma Yanaşması

Yarış ərzində hər saat əlavə olunan yeni tələblərə ("Challenge Drop") sürətli və təhlükəsiz reaksiya vermək üçün arxitektura aşağıdakı prinsiplər əsasında qurulub:

1. **Mərkəzləşdirilmiş Parametrlər (`backend/src/config/constants.js`):**
   - `REROUTE_OCCUPANCY_PERCENT` (`90`), `CRITICAL_OCCUPANCY_PERCENT` (`95`), `SOS_CLUSTER_MIN_COUNT` (`4`), `SOS_CLUSTER_RADIUS_METERS` (`500`), `SOS_CLUSTER_WINDOW_MINUTES` (`5`) sabitləri bir yerdə saxlanılır. Hədlər dəyişdikdə yalnız bu konfiqurasiya yenilənir.
2. **Prisma ORM Sxem Çevikliyi (`backend/prisma/schema.prisma`):**
   - Yeni təhlükə növləri (`HazardType` enum), prioritet kateqoriyalar (məs. yaşlılar/əlillər), və ya əlavə resurs atributları birbaşa Prisma sxeminə əlavə edilərək `npx prisma db push` ilə bazaya ötürülür.
3. **Təmiz Servis Ayrımı (`services/`):**
   - Qraf marşrutlaşdırması (`routingService.js`), təxliyə qərarı (`evacuationService.js`) və böhran mühərriki (`crisisEngineService.js`) DB-dən ayrılmış təmiz funksiyalar şəklində yazılıb. Yeni qayda (məs. külək istiqaməti, təhlükə radiusu və ya yeni prioritet çəkisi) əlavə edildikdə dərhal `vitest` testləri ilə yoxlana bilir.
4. **Simulyasiya və Real-Time Sinxronizasiya (`Socket.IO`):**
   - İstənilən yeni hadisə növü `io.emit('state:updated', ...)` kanalı ilə həm Vətəndaş, həm də Dispetçer ekranlarını yenidən yükləmədən (zero-refresh) sinxronlaşdırır.

---

## 5. Dispetçer Autentifikasiyası və Təhlükəsizlik Axını

Dispetçer panelinə (`/dispatcher`), yol bağlama əməliyyatlarına və simulyasiya idarəetməsinə yalnız autentifikasiyadan keçmiş operatorlar daxil ola bilər:

- **Şifrə Təhlükəsizliyi:** Parollar `node:crypto` (`scrypt` + fərdi random salt + `timingSafeEqual`) ilə heşlənir.
- **Sessiya İdarəetməsi:** `POST /api/auth/login` uğurlu olduqda `HS256` JWT token yaradılır və **HttpOnly / SameSite=Lax** cookie (`crisis_dispatcher_token`) olaraq təyin edilir (API testləri üçün `Authorization: Bearer <token>` də dəstəklənir).
- **Brute-Force Mühafizəsi:** Eyni IP-dən 15 dəqiqədə 10 uğursuz giriş cəhdi olduqda `HTTP 429` qaytarılır.
- **WebSocket İcazəsi:** Yalnız etibarlı dispetçer JWT-sinə sahib Socket.IO bağlantıları `dispatchers` otağına qoşulur və canlı SOS / Qırmızı Həyəcan hadisələrini qəbul edir.

### İlkin Dispetçer Hesabları (Seeded)
| İstifadəçi adı | Şifrə (Default) | Rol | Nişan Kodu |
|---|---|---|---|
| `dispatcher1` | `Fhn112!Crisis` | `DISPATCHER` | `FHN-112` |
| `commander` | `Cmd001!Crisis` | `COMMANDER` | `CMD-001` |

*(İstehsal mühitində `SEED_DISPATCHER_PASSWORD`, `SEED_COMMANDER_PASSWORD` və `JWT_SECRET` mühit dəyişənləri ilə dəyişdirilə bilər.)*

---

## 6. Challenge Drop #1: Prioritet SOS & Maneəsiz Təxliyə + Dinamik Çoxdillilik (`AZ | EN`)

Sistemə sonradan əlavə edilən tələblər əsasında iki kritik funksional qat tətbiq edilmişdir:

1. **Hərəkət Məhdudiyyətli Şəxs / Xüsusi Qayğı (`SPECIAL_CARE`) Rolu və Prioritet #1 SOS:**
   - Vətəndaş interfeysində `Standart Vətəndaş` və `Hərəkət Məhdudiyyətli / Xüsusi Qayğı` profili seçilə bilir.
   - `SPECIAL_CARE` rejimində göndərilən SOS müraciətləri bazada avtomatik `priorityLevel = 1` (**Kritik Prioritet / Priority #1**) statusu alır və Dispetçer panelində axının ən yuxarısında sabitləşdirilərək ani səs/vizual xəbərdarlıq yaradır.
   - Marşrutlaşdırma mühərriki (`routingService.js` + `evacuationService.js`) `accessibleOnly=true` rejimində pilləkənli/pandussuz yol seqmentlərini (`isWheelchairAccessible = false`) və yeraltı/əlçatmaz sığınacaqları avtomatik kənarlaşdıraraq **yalnız əlil arabası və tibbi nəqliyyat üçün uyğun (panduslu, maneəsiz)** marşrut və toplanış məntəqəsi təyin edir.
2. **Dinamik İkidilli İnterfeys (`AZ` / `EN` i18n):**
   - Naviqasiya panelində yerləşən `AZ | EN` keçidi vasitəsilə bütün Vətəndaş, Dispetçer, Giriş, Xəritə legendaları, bildirişlər (`toast`) və status etiketləri səhifəni yeniləmədən real vaxtda Azərbaycan və İngilis dilləri arasında dəyişdirilir.

---

## 7. Əsas API Endpoint-ləri

| Metod | Endpoint | İcazə | Təyinat |
|---|---|---|---|
| `POST` | `/api/auth/login` | Açıq | Dispetçer girişi (HttpOnly JWT cookie) |
| `POST` | `/api/auth/logout` | Açıq | Dispetçer sessiyasının sonlandırılması |
| `GET` | `/api/auth/me` | Dispetçer JWT | Cari operator profili |
| `GET` | `/api/zones` | Açıq | Şəhər rayonlarının siyahısı |
| `GET` | `/api/citizen/evacuation-plan` | Açıq | Ən yaxın məntəqələr, doluluq %, aktiv/alternativ və maneəsiz (`accessibleOnly`) marşrut |
| `POST` | `/api/citizen/sos` | Açıq | 1 kliklə SOS göndərmək (`citizenCategory`: `STANDARD` \| `SPECIAL_CARE`) |
| `PATCH` | `/api/citizen/safe` | Açıq | `"Təhlükəsizəm"` statusunu yeniləmək |
| `GET` | `/api/traffic/roads` | Açıq | Yol-nəqliyyat şəbəkəsinin cari vəziyyəti |
| `PATCH` | `/api/traffic/roads/:id/status` | **Dispetçer JWT** | Yolun statusunu dəyişmək (`OPEN`, `CONGESTED`, `CLOSED`) |
| `GET` | `/api/dispatcher/dashboard` | **Dispetçer JWT** | Dispetçer panelinin tam canlı məlumatı (Priority #1 sıralamalı SOS axını) |
| `PATCH` | `/api/dispatcher/shelters/:id/occupancy` | **Dispetçer JWT** | Toplanış məntəqəsinin doluluğunu/statusunu yeniləmək |
| `POST` | `/api/dispatcher/sos/:id/dispatch` | **Dispetçer JWT** | SOS siqnalına xilasetmə briqadası yönləndirmək |
| `POST` | `/api/dispatcher/alerts/:id/execute` | **Dispetçer JWT** | Qırmızı Həyəcan qərarını 1 kliklə icra etmək |
| `POST` | `/api/simulation/*` | **Dispetçer JWT** | Demo ssenariləri (`sos-burst`, `road-toggle`, `occupancy-spike`, `reset`) |
