# Calisma Plani (Roadmap)

Bu plan, isteklerini modullere bolecek sekilde "revize edilebilir" ve dosya yapisini bozmadan adim adim gelistirilebilir bir surec cikarir.

Not: Dokuman dili kolay kopyala-yapistir icin ASCII tutuldu.

## Faz 0 - Temel iskelet (bu ZIP'te var)

- UI iskeleti + sayfalar (Server, Mods, Console, Configs, Logs, CFTools, Settings)
- Settings DB (dosya icinde manuel degisiklik yok)
- SteamCMD ile workshop mod indirme (ID ile)
- Mod enable/disable
- DayZ process start/stop/restart
- BattlEye BEServer_x64.cfg parse + raw editor
- BattlEye RCON console (komut gonderme)
- Log sistemi (app log + script log + UI'dan goruntuleme)

## Faz 1 - "Omega Manager" benzeri temel yonetim

- Instance mantigi (data/instances/<id>)
  - birden fazla DayZ server profili ekleme
  - her instance icin ayri config, mod listesi, schedule, log
- Parameter builder (UI -> launch args)
  - -config, -profiles, -port, -BEpath, -dologs, -adminlog, vb.
  - UI'dan mod sirasi (load order)
- Mod yonetimi (gelismis)
  - Workshop arama (Steam Web API veya cache)
  - Koleksiyon ID import
  - Mod update kontrol + tek tusla guncelle
  - Keys senkronizasyonu ve mod klasor yapisi dogrulama
- RCON "feature" katmani
  - oyuncu listesi + kick/ban/whitelist
  - broadcast, scheduled messages
  - macros / komut presetleri

## Faz 2 - CFTools Cloud / GameLabs ozellikleri

GameLabs mod/plugin server'a kuruldugunda CFTools Cloud uzerinden event ve data saglar.
Panel tarafinda hedef:

- CFTools Data API baglantisi (token refresh, rate limit)
- Player analytics
  - online history, killfeed, economy/traders (varsa), heatmap
- Priority queue / whitelist / ban sync
- Webhooks & alerting
  - discord webhook: restart, crash, population spikes
- Actions API (varsa): oyun ici aksiyonlar (dynamic actions)

## Faz 3 - Profesyonel gelistirme sureci

- Versiyonlama: SemVer (v0.1, v0.2, ...)
- Git branch stratejisi: main + develop + feature/*
- Issue temelli backlog
- Testler:
  - unit: settings/config parser
  - integration: steamcmd wrapper (mock)
- Observability:
  - request tracing id
  - structured logs + error codes

## Faz 4 - Kurulum ve servis

- Windows Service olarak calistirma (NSSM veya node-windows)
- Otomatik update mekanizmasi
- Backup/restore (db + config)

## "Revize isteme" prensibi

Her gelistirme isteginde su kural:
- data/instances/ yapisi degismez
- API version prefix (ornegin /api/v1) ile geriye uyumluluk korunur
- Ayarlar DB'de tutulur; dosya icinde manual edit gerektirmez
