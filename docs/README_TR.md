# DayZ Web Panel — Windows 11 Kurulum Rehberi (TR)

Bu dokuman, Windows 11 uzerinde panelin kurulumu, baslatilmasi ve sorun giderme adimlarini icerir.

## 1) Onkosullar
- Windows 11
- Internet erisimi (SteamCMD, npm paketleri icin)
- Diskte yeterli alan (DayZ server + modlar icin)

## 2) Varsayilan yollar
UI tarafindan degistirilebilir, ancak varsayilanlar:
- DayZ server: `E:\steamcmd\steamapps\common\DayZServer`
- SteamCMD: `E:\steamcmd\steamcmd.exe`
- BattlEye cfg: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye\BEServer_x64.cfg`
- BattlEye profiles: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye`

## 3) Kurulum
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

## 4) Baslatma

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

## 5) Doctor komutu
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
- RCON dependency (battle-node-v2) sagligi

## 6) Sorun Giderme (FAQ)

### A) Kurulum sirasinda npm komutlari yarida kesiliyor
- Windows batch dosyalarinda `npm` komutlari `call npm ...` olarak calismalidir.
- `scripts\windows\install.bat` bu sekilde guncellenmistir.

### B) `dist/server/node-build.mjs` yok
- `npm run build` calistirin
- `scripts\windows\start.bat` zaten bu kontrolu yapar

### C) RCON calismiyor
- `battle-node-v2` npm paketi yuklu mu kontrol edin
- `npm run doctor` ile RCON dependency sagligini gorun
- Eksikse `npm install` tekrar calistirin

### D) Ayar yollarini guncellemek
UI uzerindeki Settings sayfasindan DayZ/SteamCMD/BattlEye pathlerini girip kaydedin.
