# Codex Task — DayZ Web Panel (Sprint 1: “Çalışır Sürüm”)

Repo: `turankoyudur/gpt`

Bu dosya Codex’in bu repoda **Windows 11 üzerinde çalışan, stabil bir v1** çıkarması için gereksinim spesifikasyonudur. Önce “çalışır sürüm”ü stabilize et, sonra altyapıyı v2/v3’e hazırla.

---

## 0) Temel hedef
- Node.js tabanlı web panel (Windows 11)
- Lokal DB: SQLite (Prisma)
- UI’dan tüm ayarlar girilebilir (dosyada manuel edit yok)
- SteamCMD + Mod yönetimi (temel)
- RCON (BattlEye) temel (connect + command + log)
- GameLabs/CFTools temel (config + 1-2 endpoint)
- Gelişmiş log + hata kodları
- Kurulum ve çalıştırma BAT dosyaları (log tutacak, kapanmayacak)

---

## 1) Gerçek yollar (Windows)
UI’dan girilecek ama defaults olarak dokümante edilecek:

- DayZ server: `E:\steamcmd\steamapps\common\DayZServer`
- BattlEye cfg: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye\BEServer_x64.cfg`
- BattlEye profiles: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye`
- SteamCMD exe: `E:\steamcmd\steamcmd.exe` (değişebilir)

---

## 2) Acceptance Criteria (mutlaka)

### A) Çalışır sürüm
1. `scripts\windows\install.bat`:
   - Windows 11’de tek başına çalışacak
   - Node LTS (22) yoksa kuracak / kontrol edecek
   - `.env` yoksa `.env.example`’dan üretecek
   - `npm install` + `prisma generate` + `prisma db push` (idempotent)
   - `npm run build` başarılı
   - Log: `data\logs\install-YYYYMMDD-HHMMSS.log`

2. `scripts\windows\start.bat`:
   - Pencere kapanmayacak (hata olursa `pause`)
   - `db:setup`’ı garanti edecek
   - `dist/server/node-build.mjs` yoksa build alacak
   - Server’i başlatacak
   - Log: `data\logs\start-YYYYMMDD-HHMMSS.log`

3. Uygulama çalışınca `http://localhost:3000` açılacak.
4. Tek bir modül bozuk diye panel komple düşmeyecek:
   - Örn. `battleye`/RCON dependency sorunu varsa panel açılacak
   - RCON ekranında net hata kodu ve mesaj dönecek (ve loglanacak)

### B) Hata kodları + log
- Backend’de merkezi `AppError` / `ErrorCodes` olacak.
- Her hata:
  - dosyaya (Winston/Pino)
  - DB’ye (ErrorLog tablosu)
  loglanacak.

### C) UI’dan config
- DayZ path, SteamCMD path, BEServer cfg path UI’dan girilip DB’ye kaydedilecek.
- BEServer_x64.cfg UI’dan okunup yazılabilecek:
  - raw edit
  - parse & key/value görünüm (en az RConPort, RConPassword, RConIP)

---

## 3) Known issues to fix (Sprint 1)

### 3.1 Windows BAT “npm.cmd” problemi
- Batch içinde `npm ...` satırları **mutlaka `call npm ...`** olmalı.
- Aksi halde script “devam etmeden” kapanır.

### 3.2 Server build output isim uyumu
- `start.bat` `dist/server/node-build.mjs` beklemeli.
- `vite.config.server.ts` rollup output bu dosyayı üretmeli.

### 3.3 ESM __dirname/import uyumu
- Proje `type: module` ise config ve server kodlarında `__dirname` ESM-safe hesaplanmalı:
  - `fileURLToPath(import.meta.url)`

### 3.4 RCON dependency sağlığı
- `battleye` gibi dependency’ler import-time’da crash etmemeli.
- RCON mimarisi: adapter + lazy-load
  - Panel açılışında crash yok
  - Connect anında dependency yüklenir
  - Eksikse `E_DEPENDENCY_MISSING` gibi hata kodu döner

---

## 4) Minimum feature set (Sprint 1)

### 4.1 Server control (temel)
- DayZ server exe start/stop/restart (Windows process)
- Parametreler DB’den okunup build edilir.

### 4.2 SteamCMD + mods (temel)
- Workshop ID ile mod ekle (DB)
- “download/update” butonu
- enable/disable → launch args’e yansısın
- Metadata best-effort (Steam Web API)

### 4.3 RCON (temel)
- connect/disconnect
- command send
- response log + UI stream

### 4.4 GameLabs/CFTools (temel)
- Settings ekranında token/server id sakla
- En az 1-2 “status/health/queue” endpoint entegre et
- Hata kodu + log

---

## 5) “Doctor” komutu (zorunlu)
`npm run doctor` ekle. Çıktı:
- Node version check (22 hedef)
- Prisma client generated mı
- DB connection ok mu
- dist output var mı
- Settings: dayz path/steamcmd path/battleye cfg path set mi
- RCON dependency health (battleye dosyaları var mı)

---

## 6) Repo hijyeni
- Repoya şunlar girmesin:
  - `node_modules/`, `dist/`, `data/logs/`, `data/*.db`, `.env`
- `.gitignore` kontrol et.

---

## 7) CI (opsiyonel ama önerilir)
- GitHub Actions: `npm ci && npm run build` (Windows runner)

---

## 8) Output (Codex teslimi)
1) `fix/windows-stable` branch
2) PR: “Fix: Windows install/start + stable build + dependency health”
3) `docs/README_TR.md` (kurulum + troubleshooting)
4) `docs/PLAN.md` (Sprint 2/3 roadmap)

---

## 9) Test Plan
1. Temiz kurulum: `scripts\windows\install.bat`
2. Başlat: `scripts\windows\start.bat`
3. Browser: `http://localhost:3000`
4. Health: `GET /health` 200
5. RCON dependency yoksa bile panel açılacak.
