# Calisma Plani (Roadmap)

Bu plan, isteklerini modullere bolecek sekilde "revize edilebilir" ve dosya yapisini bozmadan adim adim gelistirilebilir bir surec cikarir.

Not: Dokuman dili kolay kopyala-yapistir icin ASCII tutuldu.

## Faz 0 - Temel iskelet (bu ZIP'te var)

Durum: Tamamlandi

- [x] UI iskeleti + sayfalar (Server, Mods, Console, Configs, Logs, CFTools, Settings)
- [x] Settings DB (dosya icinde manuel degisiklik yok)
- [x] SteamCMD ile workshop mod indirme (ID ile)
- [x] Mod enable/disable
- [x] DayZ process start/stop/restart
- [x] BattlEye BEServer_x64.cfg parse + raw editor
- [x] BattlEye RCON console (komut gonderme)
- [x] Log sistemi (app log + script log + UI'dan goruntuleme)

## Faz 1 - "Omega Manager" benzeri temel yonetim

Durum: Tamamlandi

- [x] Instance mantigi (data/instances/<id>)
  - [x] birden fazla DayZ server profili ekleme
  - [x] her instance icin ayri config, mod listesi, schedule, log
- [x] Parameter builder (UI -> launch args)
  - [x] -config, -profiles, -port, -BEpath, -dologs, -adminlog, vb.
  - [x] UI'dan mod sirasi (load order)
- [x] Mod yonetimi (gelismis)
  - [x] Workshop arama (Steam Web API veya cache)
  - [x] Koleksiyon ID import
  - [x] Mod update kontrol + tek tusla guncelle
  - [x] Keys senkronizasyonu ve mod klasor yapisi dogrulama
- [x] RCON "feature" katmani
  - [x] oyuncu listesi + kick/ban/whitelist
  - [x] broadcast, scheduled messages
  - [x] macros / komut presetleri

## Faz 2 - CFTools Cloud / GameLabs ozellikleri

Durum: Tamamlandi

GameLabs mod/plugin server'a kuruldugunda CFTools Cloud uzerinden event ve data saglar.
Panel tarafinda hedef:

- [x] CFTools Data API baglantisi (token refresh, rate limit)
- [x] Player analytics
  - [x] online history, killfeed, economy/traders (varsa), heatmap
- [x] Priority queue / whitelist / ban sync
- [x] Webhooks & alerting
  - [x] discord webhook: restart, crash, population spikes
- [x] Actions API (varsa): oyun ici aksiyonlar (dynamic actions)

## Faz 3 - Profesyonel gelistirme sureci

Durum: Tamamlandi

- [x] Versiyonlama: SemVer (v0.1, v0.2, ...)
- [x] Git branch stratejisi: main + develop + feature/*
- [x] Issue temelli backlog
- [x] Testler:
  - [x] unit: settings/config parser
  - [x] integration: steamcmd wrapper (mock)
- [x] Observability:
  - [x] request tracing id
  - [x] structured logs + error codes

## Faz 4 - Kurulum ve servis

Durum: Tamamlandi

- [x] Windows Service olarak calistirma (NSSM veya node-windows)
- [x] Otomatik update mekanizmasi
- [x] Backup/restore (db + config)

## "Revize isteme" prensibi

Her gelistirme isteginde su kural:
- [x] data/instances/ yapisi degismez
- [x] API version prefix (ornegin /api/v1) ile geriye uyumluluk korunur
- [x] Ayarlar DB'de tutulur; dosya icinde manual edit gerektirmez
