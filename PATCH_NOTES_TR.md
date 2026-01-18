# DayZ Web Panel Patch v0.1.3 (RCON + Log iyilestirmeleri)

Bu ZIP bir "patch" paketidir.
Amac: proje klasorunuza **sadece cikartarak** (extract) gerekli dosyalari guncellemektir.

## Neleri duzeltiyor?

### 1) Log sistemi (app log)
- `data/logs/app-YYYY-MM-DD.log` artik **tek satir / tek log** seklinde yazar.
- Her satirin basinda tam zaman damgasi vardir:
  `YYYY-MM-DD HH:mm:ss.SSS [level] ...`
- Stack trace'ler tek satira indirgenir (Logs UI'yi bozmamak icin).

### 2) RCON ayarlari artik Web UI'den
- BattlEye cfg dosyasina (BEServer_x64*.cfg) **bagimli degiliz**.
- DayZ sunucusu basladiktan sonra cfg adini degistirebildigi icin (or. `BEServer_x64_active_113.cfg`) bu dosyadan sifre/port okumuyoruz.
- RCON Host/Port/Password ve Auto-connect ayarlari `Settings` ekranina eklendi.

### 3) Sunucu baslayinca otomatik RCON baglansin
- `Settings -> RCON -> Auto-connect` true ise, sunucu start edildikten sonra panel RCON'a baglanmayi dener.
- 15 saniye bekler, sonra 10 saniyede bir tekrar dener.
- Yaklasik 5 dakika sonra vazgecer.

## Kurulum (Windows 11)

1) Paneli kapatin (start.bat aciksa kapatin)
2) Bu ZIP'i proje kok dizinine cikarin:
   - Ornek: `C:\github\panel\`
   - ZIP icindeki `server/` ve `client/` klasorleri proje icindekiyle ayni hizada olmalidir.
3) Tekrar calistirin:
   - `scripts\windows\start.bat`
4) Tarayicida:
   - `http://localhost:3000/settings`
   - RCON bilgilerini doldurun:
     - RCON Host: genelde `127.0.0.1`
     - RCON Port: BEServer cfg icindeki RConPort (ornegin 2306)
     - RCON Password: BEServer cfg icindeki RConPassword

## Notlar
- BattlEye cfg yolu (`battleyeCfgPath`) artik **dosya veya klasor** olabilir.
  - onerilen: `...\profiles\BattlEye` klasoru
- RCON baglanmazsa:
  - Dogru port/sifre mi?
  - Firewall engelliyor mu?
  - Sunucu tam boot olmadan baglanmaya calisiyorsa biraz bekleyin (oto-retry var).
