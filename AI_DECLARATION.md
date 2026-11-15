# Süni İntellekt (AI) İstifadəsi Haqqında Bəyannamə (AI Declaration)

Bu sənəd **"Urban Crisis & Crowd Evacuation Engine"** hakaton layihəsinin hazırlanması prosesində istifadə olunan süni intellekt alətlərini, onların tətbiq mərhələlərini və komanda tərəfindən həyata keçirilən mühəndislik nəzarətini şəffaf şəkildə əks etdirir.

---

## 1. İstifadə Olunan AI Alətləri

| Alət | İstifadə Məqsədi | Mərhələ |
|---|---|---|
| **Antigravity AI Agent (Gemini)** | Sistem arxitekturasının planlaşdırılması, Prisma verilənlər bazası sxeminin dizaynı, Dijkstra marşrutlaşdırma və Kritik Böhran Alqoritmi kod şablonlarının hazırlanması, Tailwind CSS UI komponentlərinin qurulması və sənədləşmə. | Planlaşdırma, Backend, Frontend, Testlər, Docker və Sənədləşmə |

---

## 2. Mərhələlər üzrə AI Tətbiqi və Nəzarət Mexanizmi

### Mərhələ 1: Arxitektura və Texnoloji Seçimlər
- **AI-nin rolu:** Tapşırıq tələblərinin (`task.txt`) təhlili əsasında ilkin arxitektura planının hazırlanması.
- **İnsan nəzarəti və düzəlişlər:** Komanda tərəfindən Node.js versiyası `v20`-dən `v24`-ə yüksəldilmiş, xam SQL (`pg`) əvəzinə **Prisma ORM** istifadəsi tələb edilmiş və auth olmayan mühitdə iki modulun vahid naviqasiya altında birləşdirilməsi qərarı təsdiqlənmişdir.

### Mərhələ 2: Backend, Verilənlər Bazası və Alqoritmlər
- **AI-nin rolu:**
  - Bakı şəhərinin 5 rayonu (Yasamal, Səbail, Nəsimi, Nərimanov, Xətai) üzrə koordinat qovşaqları, yol seqmentləri, toplanış məntəqələri və briqadalar üçün başlanğıc (`seedData.js`) məlumatlarının yaradılması.
  - `routingService.js` (Dijkstra qısa yol alqoritmi), `evacuationService.js` (`>= 90%` doluluq və yol bağlanması zamanı avtomatik alternativ marşrut) və `crisisEngineService.js` (5 dəqiqə ərzində eyni zonada və ya 500m radiusda 4+ SOS, eləcə də `> 95%` doluluq zamanı Qırmızı Həyəcan) servislərinin yazılması.
- **İnsan nəzarəti və yoxlama:**
  - Avtomatlaşdırılmış testlər zamanı ilkin marşrutlaşdırma məntiqində başlanğıc nöqtəsinin birdən çox qovşağa birbaşa virtual xətlə bağlanması nəticəsində yol bağlanmasını yan keçmə xətası aşkarlanmış və düzəldilmişdir (origin yalnız ən yaxın açıq yol qovşağına bağlanır).
  - Bütün hədlər (`90%`, `95%`, `500m`, `5 dəq`, `4 SOS`) vahid `constants.js` faylında yoxlanılaraq təsdiq edilmişdir.

### Mərhələ 3: Testləşdirmə və Etibarlılıq
- **AI-nin rolu:** `vitest` və `supertest` istifadə edərək `crisisAndRouting.test.js` test paketinin yazılması.
- **İnsan nəzarəti və yoxlama:** Haversine məsafə hesablamaları, `CLOSED` yol ətrafından dolanma, `>= 90%` doluluqda məntəqə dəyişimi, `4 SOS / 500m` klasteri, `95%` vs `96%` hədd fərqi və `Zod` validasiya testləri icra olunaraq bütün testlərin uğurla keçməsi təsdiqlənmişdir.

### Mərhələ 4: Frontend və Real-Time İnterfeys
- **AI-nin rolu:** React 18, Tailwind CSS, `react-leaflet` interaktiv xəritəsi və `Socket.IO` canlı bildiriş komponentlərinin yaradılması.
- **İnsan nəzarəti və yoxlama:** Sistem sıfırlandıqda (`SYSTEM_RESET`) PostgreSQL autoincrement ID-lərinin yenilənməsi səbəbindən frontend dropdown və aktiv SOS vəziyyətinin sinxron qalması üçün əlavə vəziyyət təmizləməsi tətbiq edilmiş və `vite build` ilə yoxlanılmışdır.

### Mərhələ 5: Təhlükəsizlik Yeniləməsi (Dispetçer Autentifikasiyası)
- **AI-nin rolu:** `Dispatcher` Prisma modelinin, `scrypt` + `HttpOnly` JWT autentifikasiya servisinin, `requireDispatcherAuth` middleware-inin, Socket.IO otaq səlahiyyətinin, React giriş/çıxış axınının və `401` təhlükəsizlik testlərinin hazırlanması.
- **İnsan nəzarəti və yoxlama:**
  - İctimai qeydiyyat (`/register`) əvəzinə əvvəlcədən təmin edilmiş (`upsert` ilə qorunan) operator hesabları seçilmişdir ki, simulyasiya sıfırlanması (`reset`) aktiv operator sessiyasını pozmasın.
  - Yalnız `/api/dispatcher/*` deyil, həm də yol bağlama (`PATCH /api/traffic/roads/:id/status`) və simulyasiya (`/api/simulation/*`) endpoint-lərinin də autentifikasiya tələb etməsi təmin edilmişdir.

### Mərhələ 6: Challenge Drop #1 (Prioritet SOS, Maneəsiz Marşrutlaşdırma və i18n)
- **AI-nin rolu:** Prisma sxeminə `CitizenCategory` (`SPECIAL_CARE`), `priorityLevel` və `isWheelchairAccessible` sahələrinin əlavə olunması, Dijkstra filtrasiyası (`routingService.js` / `evacuationService.js`), mövcud DB həcmləri üçün avtomatik miqrasiya (`bootstrap.js`), `I18nContext` (`az` / `en`) və UI komponentlərinin yenilənməsi.
- **İnsan nəzarəti və yoxlama:**
  - Mövcud konteyner verilənlər bazası həcmində (`postgres_data`) cədvəl sütunları əvvəlcədən doldurulmuş sətirlərlə qaldığı üçün `bootstrap.js` daxilində pilləkənli/pandussuz yol və sığınacaq bayraqlarını avtomatik sinxronlaşdıran idempotent funksiya (`syncAccessibilityFlags`) əlavə edilmişdir.
  - `vitest` test dəstinə əlil arabası / maneəsiz marşrut testi əlavə edilərək tam yoxlama aparılmışdır.

---

## 3. Məsuliyyət Bəyannaməsi
Komanda olaraq layihədə yazılan hər bir kod sətirinin, verilənlər bazası modelinin və biznes alqoritminin iş prinsipini tam başa düşdüyümüzü, AI tərəfindən yaradılan bütün hissələrin testlər və canlı icra vasitəsilə yoxlanıldığını bəyan edirik.
