# DayZ Web Panel (Node.js) — "Omega / CF Cloud" style

Bu proje, Windows 11 üzerinde çalışan **DayZ Dedicated Server** için modern bir web panelidir.
Hedef: Omega Manager / CFTools Cloud benzeri bir deneyim sunmak; **SteamCMD**, **mod yönetimi**, **BattlEye RCON**, **config editörleri**, **loglar** ve **CFTools/GameLabs entegrasyonunu** tek panelde toplamak.

> Bu repo, senin yüklediğin Web UI tasarımını temel alarak geliştirildi.

## Mevcut sürümde (v0.1) neler var?

- **Kurulum / çalıştırma scriptleri** (loglu)
  - Windows: `scripts/windows/install.bat`, `scripts/windows/start.bat`
  - Linux/Codex: `scripts/linux/install.sh`, `scripts/linux/start.sh`
- **SQLite lokal DB** (Prisma)
  - Ayarlar (DB’de), mod listesi, hata logları
- **Settings ekranı**
  - SteamCMD yolu, DayZ server yolu, profiles yolu, BattlEye cfg yolu
  - server port, serverDZ.cfg adı, ek launch argümanları
  - Steam kullanıcı/şifre (SteamCMD workshop indirme için)
  - CFTools / GameLabs Data API credential alanları
- **Mod yönetimi**
  - Workshop ID ekle, workshop detayını çek (best-effort)
  - SteamCMD ile mod indirme
  - Enable/Disable ile server start argümanına otomatik dahil etme
- **Server kontrol**
  - Start / Stop / Restart
  - Enable modlar için server klasörüne **Junction link (mklink /J)** (Windows) veya **symlink** (Linux) oluşturma
- **BattlEye config editor**
  - `BEServer_x64.cfg` parse + raw edit
- **RCON Console**
  - Connect / Disconnect
  - Komut gönderme (players, say, kick, ban, ...)
- **Log görüntüleme**
  - `./data/logs` altındaki logları listeleme ve tail

## Kurulum (Windows 11)

1. ZIP’i bir klasöre çıkar.
2. Yönetici olarak PowerShell / CMD aç.
3. Aşağıdaki dosyayı çalıştır:

   `scripts\windows\install.bat`

Bu script:
- `winget` ile **Node.js LTS** kurar (yüklü değilse)
- `npm install`
- `.env.example` -> `.env` kopyalar
- DB’yi başlatır (`prisma db push`)
- Build alır

4. Ardından paneli başlat:

   `scripts\windows\start.bat`

5. Tarayıcıdan aç:

   `http://localhost:3000`

> Hem `install.bat` hem `start.bat` çıktıları `./data/logs/...` altına loglanır.

## Kurulum (Linux / Codex)

1. ZIP’i bir klasöre çıkar.
2. Terminal aç ve aşağıdaki scriptleri çalıştır:

   ```bash
   chmod +x scripts/linux/install.sh scripts/linux/start.sh
   scripts/linux/install.sh
   ```

Bu script:
- Node.js 22.x mevcut mu kontrol eder
- `pnpm install` (yoksa `npm install`)
- `.env.example` -> `.env` kopyalar
- DB’yi başlatır (`prisma db push`)
- Build alır

3. Ardından paneli başlat:

   ```bash
   scripts/linux/start.sh
   ```

4. Tarayıcıdan aç:

   `http://localhost:3000`

> Hem `install.sh` hem `start.sh` çıktıları `./data/logs/...` altına loglanır.

## GitHub'a yukleme (opsiyonel)

Projeyi kendi GitHub deponuza (ornegin `dayz-webpanel-new`) yuklemek icin:

1. `scripts\windows\publish_github.bat` dosyasini **cift tiklayarak** calistirin (her yerden calisir).
2. Script icindeki `REPO_URL=` satirini kendi repo adresinize gore duzenleyin.
3. Script; repo'yu klonlar, dosyalari kopyalar, commit atar ve branch'i push eder.

Loglar: `./data/logs/publish-github-*.log`

## İlk Konfigürasyon

Panel açıldıktan sonra **Settings** ekranına git:

- **DayZ Server Path** (senin örneğin):
  - `E:\steamcmd\steamapps\common\DayZServer`
- **Profiles Path**:
  - `E:\steamcmd\steamapps\common\DayZServer\profiles`
- **BattlEye CFG Path**:
  - `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye\BEServer_x64.cfg`
- **SteamCMD Path**:
  - `E:\steamcmd\steamcmd.exe`

Kaydet → `Health Check` kartında yolların OK olduğunu gör.

## Dosya Yapısı (MCS Manager benzeri)

```
dayz-web-panel/
  client/                # React + Tailwind UI
  server/                # Express API + servisler
  prisma/                # DB şeması
  data/
    app.db               # SQLite DB (otomatik oluşur)
    logs/                # app/install/start logları
    instances/
      default/           # gelecekte multi-instance için ayrılmış alan
  scripts/windows/
    install.bat
    start.bat
  scripts/linux/
    install.sh
    start.sh
```

## Mimari

Backend modüler tasarlandı:

- `server/modules/settings` → DB’de settings yönetimi
- `server/modules/config` → DayZ/BattlEye config okuma-yazma
- `server/modules/mods` → Workshop mod DB + SteamCMD download + enable/disable
- `server/modules/server-control` → DayZ process start/stop + junction link
- `server/modules/logs` → log list/tail

Her modül:
- `*.service.ts` → iş mantığı
- `*.routes.ts` → API endpointleri

## Geliştirme (Developer Mode)

```bash
npm install
npm run dev
```

> Dev modda Vite dev server çalışır. Prod için `npm run build` + `npm run start`.

## Hata Kodları ve Loglama

- Backend’de `AppError` ile **stabil hata kodları** üretilir (`server/core/errors.ts`).
- Hatalar hem dosyaya (Winston) hem DB’ye (ErrorLog) yazılacak şekilde tasarlandı.

## Yol Haritası

Detaylı çalışma planı: `docs/PLAN.md`
