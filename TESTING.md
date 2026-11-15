# Testləşdirmə Strategiyası — Urban Crisis & Crowd Evacuation Engine

Bütün testlər avtomatlaşdırılmış spec fayllarıdır və hər push və pull request zamanı CI (`.github/workflows/ci.yml`) daxilində icra olunur.

## İcmal

| Test dəsti | Əmr | Test sayı | Nəyi sübut edir |
|---|---|---|---|
| Backend unit | `cd backend && npm test` | 72 | Təmiz biznes qaydaları: marşrutlaşdırma, alternativ marşrut (rerouting), hədlər, circuit breaker, fallback zənciri, rate limit-lər, CORS, xəta kontraktı |
| Backend inteqrasiya | `cd backend && npm run test:integration` | 55 | Real PostgreSQL + Prisma tranzaksiyaları, marşrutlaşdırma provayderinə real HTTP sorğuları, real Socket.IO serveri |
| Frontend | `cd frontend && npm test` | 24 | i18n uyğunluğu (AZ = EN açarları və placeholder-lər), Qırmızı Həyəcan banneri, oflayn banner, marşrut kartı, API xəta tərcüməsi |
| Əhatə dairəsi (Coverage) | `cd backend && npm run test:coverage` | 127 | **92.3 % sətir · 94.6 % funksiya · 81.2 % budaq** (80 / 80 / 70-dən aşağı olduqda CI xəta verir) |
| Yük testi (Load test) | `cd backend && npm run loadtest` | 600 × 3 ssenari | Botnet orta gecikmə **141–252 ms** (< 300 ms), təkrarlanan axın → 1 qeyd, tək mənbə → 429 |

## Tələb → test izlənilməsi

| Tələb (task.txt) | Test fayl(lar)ı |
|---|---|
| Ən yaxın toplanış məntəqələri, doluluq %, tövsiyə olunan marşrut | `unit/crisisAndRouting.test.js`, `integration/routingResilience.int.test.js` |
| Yol bağlandıqda avtomatik alternativ marşrut | `unit/crisisAndRouting.test.js` (alternativ marşrut), `integration/simulation.int.test.js` (road-toggle → plan bağlı yoldan yayınır) |
| **90 %** doluluqda avtomatik alternativ marşrut | `unit/thresholds.test.js` (89.9 % saxlayır / 90 % yönləndirir), `unit/crisisAndRouting.test.js` |
| 1 kliklə SOS (4 təhlükə növü) + "Təhlükəsizəm" | `integration/citizenSafety.int.test.js` |
| Canlı dispetçer paneli (SOS, doluluq, briqadalar) | `integration/realtime.int.test.js`, `integration/citizenSafety.int.test.js` |
| Qırmızı Həyəcan: **≥ 4 fərqli** SOS / **500 m** və ya eyni zona / **5 dəq** | `unit/thresholds.test.js` (500 m vs 501 m, vaxt pəncərəsi başlanğıcı), `unit/crisisRules.test.js` (fərqli vətəndaşlar), `integration/crisisEngine.int.test.js` |
| Qırmızı Həyəcan: doluluq **> 95 %** | `unit/thresholds.test.js` (95.0 % xeyr / 95.2 % bəli), `integration/crisisEngine.int.test.js` |
| 1 kliklə icra (briqada + yeni toplanış məntəqəsi) | `integration/crisisEngine.int.test.js` (o cümlədən iki dispetçer eyni anda kliklədikdə → yalnız bir briqada) |
| **Drop #1** Prioritet #1 xüsusi qayğı SOS + maneəsiz (panduslu) marşrut | `unit/crisisAndRouting.test.js`, `unit/crisisRules.test.js` (`MEDICAL` briqadaya üstünlük verilir), `component EvacuationRouteCard.test.jsx` |
| **Drop #1** AZ / EN dil dəyişdirilməsi | `frontend i18n/translations.test.js`, `RedAlertBanner.test.jsx`, `lib/api.test.js` |
| **Drop #2** Marşrutlaşdırma API-si 503 / > 5 san → circuit breaker + fallback + "Oflayn" bildirişi | `unit/circuitBreaker.test.js`, `unit/routingGateway.test.js`, `integration/routingResilience.int.test.js`, `RoutingModeBanner.test.jsx` |
| **Drop #3** 500+ SOS seli (flood): rate limit + təkrar filtr, panel bloklanmır | `integration/sosFlood.int.test.js`, `unit/floodProtection.test.js`, `unit/rateLimits.test.js`, `frontend lib/throttle.test.js` |
| **Drop #3** Briqada göndərişi JWT + RBAC ilə qorunur | `integration/rbac.int.test.js`, `SosFeedList.test.jsx`, `RedAlertBanner.test.jsx` |
| **Drop #3** Kütləvi sorğular altında orta gecikmə < 300 ms | `integration/sosFlood.int.test.js` (`Server-Timing` üzrə server-tərəfli orta), `loadtest/sosFlood.js` (end-to-end) |

## Əhatə olunan etibarlılıq və təhlükəsizlik ssenariləri

- **Eyni vaxtlılıq (Concurrency):** Eyni anda gələn 4 SOS → bir xəbərdarlıq; iki paralel "icra et" kliki → bir briqada; son boş briqada üçün yarışan iki xəbərdarlıq → heç vaxt eyni briqada təyin edilmir.
- **Sahiblik (IDOR):** SOS-u bağlamaq üçün onun birdəfəlik giriş tokeni tələb olunur (tokensiz 400, səhv tokenlə 403).
- **Məxfilik (Privacy):** Anonim soketlər heç vaxt SOS adlarını/telefon nömrələrini almır; vətəndaş yalnız öz SOS-unun fərdi məlumatlardan (PII) təmizlənmiş statusunu alır.
- **Xarici asılılıq xətası:** HTTP 503, timeout müddətini aşma, provayder prosesinin dayanması (connection refused), circuit açıq vəziyyətdədir (sorğu göndərilmir), yol bağlandıqdan sonra köhnə keş (stale cache) heç vaxt istifadə edilmir, avtomatik bərpa.
- **Sui-istifadə (Abuse):** SOS seli → 429, uğursuz girişlər → 429, CORS kənar origin-ləri rədd edir, JWT heç vaxt cavab gövdəsində (response body) qaytarılmır.
- **Giriş validasiyası:** Yanlış gövdə / sorğu / yol parametrləri → sabit `code` ilə 400.

## Yük testi (`backend/loadtest/sosFlood.js`)

Heç bir xarici asılılığı yoxdur. 100 sorğuluq isinmədən (warm-up) sonra 500 paralel əlaqə (concurrency) ilə 600 sorğudan ibarət üç ssenari icra edilir: **botnet** (`X-Forwarded-For` vasitəsilə fərqli IP-lər + fərqli vətəndaşlar), **tək mənbədən sel**, **təkrarlanan axın**; bu müddət ərzində dispetçer paneli davamlı yükləyir və sonda briqada göndərir. Yalnız botnet orta gecikməsi < 300 ms olduqda çıxış kodu 0 olur. Docker Desktop-un port proksisini kənarlaşdırmaq üçün testi Docker şəbəkəsinin daxilində icra edin (bax: README §8).

Niyə iki fərqli gecikmə göstəricisi var: prosesdaxili inteqrasiya testi **server-tərəfli** orta göstəricini (`Server-Timing`-dən ~50–100 ms) yoxlayır, çünki tək bir test prosesi eyni anda 600 xam TCP bağlantısı aça bilmir (macOS listen backlog = 128); yük testi isə real konteynerə qarşı **end-to-end** gecikməni ölçür.

## İnteqrasiya testlərinin icra qaydası

Bu testlər **ayrıca `urban_crisis_test` verilənlər bazasından** istifadə edir və demo bazasına heç vaxt toxunmur. Sxem hər icrada bir dəfə sinxronlaşdırılır (`prisma db push`, dağıdıcı olmayan rejimdə) və hər test deterministik Bakı məlumat dəstini yenidən toxumlayır. Quraşdırma adı `_test` ilə bitməyən verilənlər bazasında işləməkdən imtina edir.

```bash
docker compose up -d postgres
docker exec urban_crisis_postgres psql -U crisis_user -d urban_crisis -c "CREATE DATABASE urban_crisis_test"
cd backend && npm run test:integration
```

Marşrutlaşdırma provayderi testləri simulyasiya edilmiş xarici API-ni proses daxilində təsadüfi portda işə salır və dəstin sürətli qalması üçün 5 saniyəlik timeout-u 400 ms-ə endirir. İstehsal (production) standartı (5000 ms) `unit/thresholds.test.js` daxilində təsdiqlənir və işləyən konteyner üzərində əllə yoxlanılıb (kəsilmə həddi: 5.03 san).

## Məlum təhlükəsizlik bildirişləri (`npm audit --omit=dev`)

| Paket | Niyə hələ yenilənməyib |
|---|---|
| `zod` < 4.6.6 (həddən artıq böyük kolleksiyalarda yaddaş tükənməsi) | Həlli major versiya yeniləməsidir (zod 4). Risk azaldılıb: ictimai API sxemlərində sərhədsiz kolleksiyalar yoxdur (yeganə massiv olan marşrutlaşdırma təyinatları 200 ilə məhdudlaşdırılıb), mətn sahələrində `.max()` limitləri var və sorğu gövdələri 1 MB ilə məhdudlaşdırılıb. |
| `deepmerge-ts` (Prisma alətləri vasitəsilə) | Yalnız klient və CLI uyğunsuzluğu yaradan Prisma major/minor dəyişikliyi ilə düzəlir; sorğu axınında deyil, yalnız build/CLI mərhələsində istifadə olunur. |

## Əhatə olunmayan hissələr (qərar əsasında)

Brauzer end-to-end testləri (Playwright) hakaton vaxt məhdudiyyəti səbəbindən əlavə edilməyib. Bunun əvəzinə end-to-end axınlar API + Socket.IO səviyyəsində əhatə olunub və brauzerdə əllə yoxlanılıb.
