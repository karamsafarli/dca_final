# Demo Ssenarisi (5 dəqiqə) + Sual-Cavab Hazırlığı

**Hazırlıq (demodan əvvəl):**
```bash
docker compose up --build -d
```
- Brauzer pəncərəsi 1: http://localhost:3000/ (Vətəndaş) — telefon görünüşü üçün DevTools mobil rejimi.
- Brauzer pəncərəsi 2: http://localhost:3000/dispatcher — `commander` ilə giriş (Sıfırla yalnız COMMANDER-ə açıqdır; parollar README-də).
- Dispetçer panelində **"Demo ssenariləri"** zolağını açın və **Sıfırla** basın.

| Vaxt | Addım | Nə göstəririk | Nə deyirik |
|---|---|---|---|
| 0:00 | Problem | — | "Fövqəladə halda vətəndaş hansı məntəqənin dolu, hansı yolun bağlı olduğunu bilmir; dispetçer yüzlərlə SOS içində kritik nöqtəni görmür." |
| 0:30 | Vətəndaş ekranı | "Hara getməli" kartı: ad, məsafə, dəqiqə, doluluq | "İlk ekranda cavab var. SOS bir kliklə, mobil panel həmişə baş barmağın altındadır." |
| 1:00 | **Yol bağla** (demo zolağı) | Vətəndaş marşrutu dərhal dəyişir, səbəb paneli | "Yenidən yükləmə yoxdur — Socket.IO; marşrut yalnız həqiqətən dəyişəndə bildiriş." |
| 1:30 | **Doluluğu 92% et** | Vətəndaş başqa məntəqəyə yönləndirilir | "90% həddi — tələbdəki dəqiq rəqəm, sərhəd testləri ilə." |
| 2:00 | **4 SOS Klasteri** | Dispetçerdə Qırmızı Həyəcan | "4 **fərqli** vətəndaş, 500 m, 5 dəq. Bir nəfərin 4 klikləməsi həyəcan yaratmır." |
| 2:30 | **Təsdiqlə və İcra Et** | Briqada göndərildi + ehtiyat məntəqə açıldı | "Bir klik, atomik tranzaksiya; iki dispetçer eyni anda kliklərsə də bir briqada gedir — testlə sübut." |
| 3:00 | Drop #1 | Vətəndaş → "Xüsusi Qayğı" → maneəsiz marşrut; SOS → dispetçerdə Prioritet #1; `EN` keçidi | "Pilləkənli yollar qrafdan çıxarılır; marşrut olmasa, 1 kliklə tibbi nəqliyyat." |
| 3:45 | Drop #2 | **API: 503** → vətəndaşda "Oflayn / Ehtiyat marşrut rejimi"; **API: Bərpa et** | "Circuit Breaker: 5 s timeout, keş → lokal qraf → koordinat matrisi. Sistem çökmür." |
| 4:15 | Drop #3 | Terminal: `cd backend && npm run loadtest` → konsolda "SOS API gecikməsi" və "N yeni SOS" toplu bildirişi; ayrıca pəncərədə `observer` → "Yalnız baxış rejimi" | "600 eyni anda saxta SOS: orta ~150–250 ms, 500-lük dublikat fırtınası tək qeyd, panel bloklanmır; briqada göndərmə yalnız icazəli rolla." |
| 4:40 | Keyfiyyət | `TESTING.md`, CI | "151 avtomatik test, 92% coverage, real PostgreSQL inteqrasiya testləri, hər push-da CI." |

**Ehtiyat plan:** internet yoxdursa xəritə plitələri görünməyə bilər — marşrut kartı və dispetçer siyahıları yenə işləyir. Drop #2-ni real çöküşlə göstərmək üçün: `docker compose stop routing-api`.

---

## Gözlənilən suallar

**500 saxta SOS paneli necə bloklamır?** Dörd qat: nginx və tətbiq rate limit, dublikatların birləşdirilməsi (500 → 1 qeyd), zona üzrə coalesced qiymətləndirmə (500 → ~2), panelin saniyədə 1 dəfə yenilənməsi. Yük testi: botnet orta 141–252 ms, dispetçer əməliyyatları 4–45 ms.

**Bot IP-ni dəyişdirərək limiti keçə bilərmi?** `X-Forwarded-For`-u nginx üzərinə yazır və backend portu yalnız localhost-dadır — başlıq saxtalaşdırması işləmir. Minlərlə real IP-dən gələn paylanmış hücuma qarşı: dublikat filtri + 4 fərqli vətəndaş qaydası; növbəti addım telefon doğrulaması.

**Niyə RBAC rolu token-dən yox, bazadan oxunur?** Hesab deaktiv edildikdə və ya rolu endirildikdə dərhal qüvvəyə minsin deyə — testlə sübut olunub.

**Niyə PostGIS yox, yaddaşda Dijkstra?** Prototip qrafı kiçikdir (millisaniyələr); qərar məntiqi marşrut mənbəyindən ayrıdır, ona görə PostGIS/OSRM-ə keçid yalnız gateway səviyyəsində dəyişiklikdir.

**İki dispetçer eyni anda "İcra et" kliklərsə?** Həyəcan sətri `SELECT … FOR UPDATE` ilə kilidlənir; ikinci klik `alreadyExecuted` alır. Briqadalar şərti `updateMany` ilə tutulur — eyni briqada iki həyəcana gedə bilməz. Hər ikisi inteqrasiya testindədir.

**Kimsə saxta SOS-larla həyəcan yarada bilərmi?** Bir cihaz yox: 4 fərqli vətəndaş kodu lazımdır və SOS dəqiqədə 10 ilə məhdudlaşır. Real sistemdə telefon/ASAN Login doğrulaması əlavə olunardı.

**Başqasının SOS-unu bağlamaq olarmı?** Xeyr — hər SOS üçün birdəfəlik token; bazada yalnız heşi var.

**Xarici API yavaş cavab verəndə istifadəçi 5 saniyə gözləyirmi?** Yalnız ilk xətalarda; 3 xətadan sonra circuit açılır və cavab ~5 ms-də lokal ehtiyatdan gəlir. Arxa plan probe bərpanı avtomatik aşkarlayır.

**Keşlənmiş marşrut bağlanmış yoldan keçə bilərmi?** Xeyr — keş açarı yolların cari vəziyyətinin heşini ehtiva edir; yol dəyişibsə lokal qraf yenidən hesablayır.

**AI-dan necə istifadə etdiniz?** `AI_DECLARATION.md`: hər mərhələ, test-first yanaşma, real mühitdə yoxlama və AI-nin rədd edilmiş/düzəldilmiş təklifləri.

**Miqyaslama?** Socket.IO Redis adapter, rate-limit və keş üçün Redis, PostGIS, oxu replikaları — `TECHNICAL_DOC.md` "Gələcək inkişaf".
