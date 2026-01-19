# DayZ Web Panel — Kurulum Rehberi (TR)

Bu dokuman, Windows 11 ve Linux uzerinde panelin kurulumu, baslatilmasi ve sorun giderme adimlarini icerir.

## 1) Onkosullar
- Windows 11 veya Linux
- Internet erisimi (SteamCMD, npm paketleri icin)
- Diskte yeterli alan (DayZ server + modlar icin)

## 2) Varsayilan yollar
UI tarafindan degistirilebilir, ancak varsayilanlar:
- Windows:
  - DayZ server: `E:\steamcmd\steamapps\common\DayZServer`
  - SteamCMD: `E:\steamcmd\steamcmd.exe`
  - BattlEye cfg: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye\BEServer_x64.cfg`
  - BattlEye profiles: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye`
- Linux:
  - DayZ server: `/opt/steamcmd/steamapps/common/DayZServer`
  - SteamCMD: `/opt/steamcmd/steamcmd.sh`
  - BattlEye cfg: `/opt/steamcmd/steamapps/common/DayZServer/profiles/BattlEye/BEServer_x64.cfg`
  - BattlEye profiles: `/opt/steamcmd/steamapps/common/DayZServer/profiles/BattlEye`

## 3) Kurulum (Windows 11)
PowerShell ya da CMD uzerinden:

```bat
scripts\windows\install.bat
```

Kurulum asamalari:
- Node.js LTS yoksa winget uzerinden kurulur
- `.env` yoksa `.env.example` kopyalanir
- `npm install` + `npm run db:setup`
- `npm run build`
- Log: `data\logs\install-YYYYMMDD-HHMMSS.log`

## 4) Baslatma (Windows 11)

```bat
scripts\windows\start.bat
```

Baslatma asamalari:
- `npm run db:setup`
- Build yoksa `npm run build`
- Server baslatilir
- Log: `data\logs\start-YYYYMMDD-HHMMSS.log`

Uygulama acildiginda:
```
http://localhost:3000
```

## 5) Kurulum (Linux)

Terminal uzerinden:

```bash
chmod +x scripts/linux/install.sh scripts/linux/start.sh
scripts/linux/install.sh
```

Kurulum asamalari:
- Node.js 22.x mevcut mu kontrol edilir
- `pnpm install` (yoksa `npm install`)
- `.env` yoksa `.env.example` kopyalanir
- `db:setup`
- `build`
- Log: `data/logs/install-YYYYMMDD-HHMMSS.log`

## 6) Baslatma (Linux)

```bash
scripts/linux/start.sh
```

Baslatma asamalari:
- `db:setup`
- Build yoksa `build`
- Server baslatilir
- Log: `data/logs/start-YYYYMMDD-HHMMSS.log`

Uygulama acildiginda:
```
http://localhost:3000
```

## 7) Doctor komutu
Sistem sagligini hizli kontrol etmek icin:

```bash
npm run doctor
```

Kontroller:
- Node.js versiyonu (22 hedef)
- Prisma client uretildi mi
- DB baglantisi
- `dist/server/node-build.mjs` mevcut mu
- Settings icinde SteamCMD / DayZ / BattlEye path’leri set mi
- RCON dependency (battleye) sagligi

## 8) Sorun Giderme (FAQ)

### A) Kurulum sirasinda npm komutlari yarida kesiliyor
- Windows batch dosyalarinda `npm` komutlari `call npm ...` olarak calismalidir.
- `scripts\windows\install.bat` bu sekilde guncellenmistir.

### B) `dist/server/node-build.mjs` yok
- `npm run build` calistirin
- `scripts\windows\start.bat` zaten bu kontrolu yapar

### C) RCON calismiyor
- `battleye` npm paketi yuklu mu kontrol edin
- `npm run doctor` ile RCON dependency sagligini gorun
- Eksikse `npm install` tekrar calistirin

### D) Ayar yollarini guncellemek
UI uzerindeki Settings sayfasindan DayZ/SteamCMD/BattlEye pathlerini girip kaydedin.
