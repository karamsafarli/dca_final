# Təhlükəsizlik Modeli (Threat Model)

Sistem fövqəladə hal zamanı işləyir: əsas risklər **saxta həyəcan**, **başqasının SOS-unu bağlamaq**, **şəxsi məlumat sızması**, **operator hesabının ələ keçirilməsi** və **xarici asılılığın çökməsidir**.

| # | Təhdid | Təsir | Tədbir | Sübut (test) |
|---|---|---|---|---|
| T1 | Başqasının SOS-unu "Təhlükəsizəm" ilə bağlamaq (IDOR, ardıcıl ID) | Xilasetmə dayandırılır | Hər SOS üçün 192-bit birdəfəlik token; bazada yalnız SHA-256; yoxlama `timingSafeEqual` ilə | `citizenSafety.int` (400 / 403) |
| T2 | Ad/telefon/koordinatın bütün brauzerlərə yayımı | Şəxsi məlumat sızması | PII yalnız `dispatchers` otağına; vətəndaş yalnız öz SOS statusunu (PII-siz) | `realtime.int` |
| T3 | Saxta Qırmızı Həyəcan (bir cihazdan çoxlu SOS) | Resursların yanlış yönləndirilməsi | 4 **fərqli** vətəndaş qaydası + dəqiqədə 10 SOS limiti | `crisisEngine.int`, `rateLimits` |
| T4 | Dispetçer parolunun brute-force-u | Operator panelinin ələ keçirilməsi | 15 dəq / 10 uğursuz cəhd limiti, `scrypt` + salt, real IP (`trust proxy`) | `rateLimits`, `auth.int` |
| T5 | XSS ilə token oğurluğu | Sessiyanın ələ keçirilməsi | JWT yalnız `HttpOnly` + `SameSite=Lax` cookie-də, cavab gövdəsində yox | `auth.int` |
| T6 | Başqa saytdan dispetçer adından sorğu (CORS) | İcazəsiz əməliyyat | Açıq origin allow-list, `*` qadağandır | `cors` |
| T7 | Eyni anda iki klik → iki briqada | Resurs israfı | Row lock + advisory lock + şərti atomik yeniləmə | `crisisEngine.int` (concurrency) |
| T8 | Yanlış/zərərli giriş | 500 xətaları, məlumat pozulması | `zod` (body, query, params), 1 MB body limiti, 500-də daxili mesaj gizlədilir, Prisma parametrləşdirilmiş sorğular | `apiErrors`, `crisisAndRouting` |
| T9 | Xarici marşrut API-si çökür / yanlış cavab verir | Vətəndaş marşrut ala bilmir | Circuit Breaker, 5 s timeout, cavab sxem yoxlaması, lokal ehtiyat | `routingResilience.int` |
| T10 | Konteynerdən qaçış / şəbəkəyə açıq DB | Server ələ keçirilməsi | Root olmayan `node` istifadəçi, DB yalnız `127.0.0.1`, healthcheck-lər | `docker compose ps` |

## Konfiqurasiya və sirlər
- Demo üçün `docker-compose.yml` default dəyərlərlə bir əmrlə işləyir. Real yerləşdirmədə `.env.example` → `.env` (`JWT_SECRET`, `POSTGRES_PASSWORD`, `ROUTING_API_CONTROL_TOKEN`) mütləq dəyişdirilməlidir; `NODE_ENV=production`-da `JWT_SECRET` olmadan backend işə düşmür.
- Seed dispetçer parolları yalnız demo üçündür (`SEED_DISPATCHER_PASSWORD`, `SEED_COMMANDER_PASSWORD` ilə dəyişdirilir).

## Məlum qalıq risklər
- Rol əsaslı icazə (DISPATCHER vs COMMANDER) hələ fərqləndirilmir; simulyasiya/reset istehsalda söndürülməli və ya yalnız COMMANDER-ə verilməlidir.
- Rate-limit proses yaddaşındadır (bir instansiya); miqyaslananda Redis store.
- Ciddi CSP siyasəti (xəritə plitələri üçün tənzimlənmiş) hələ əlavə olunmayıb.
- `npm audit`: `zod` 3 və `deepmerge-ts` — təfərrüat `TESTING.md`-də.
