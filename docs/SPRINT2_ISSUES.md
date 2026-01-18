# Sprint-2 Issue Breakdown (Plan)

Milestone: **Sprint-2**

Labels: **steamcmd**, **mods**, **rcon**, **cftools**, **ui**, **infra**, **bug**

> Not: Sprint-2 icin sadece is parcasi (issue) planidir. Kod degisikligi yok.

## SteamCMD / Workshop
1. **Workshop Search UI + API**
   - Label: steamcmd, mods, ui
   - Kapsam: text search, title/id/updated/size/required DLC gosterimi, "Add" butonu.
2. **Collection import**
   - Label: steamcmd, mods
   - Kapsam: collection URL/ID parse, modlari listele, tek tikla ekle, bagimlilik raporu.
3. **Mod install pipeline (queue + retry)**
   - Label: steamcmd, mods
   - Kapsam: ayni anda x indirme, progress, retry.
4. **Launch arg builder (mod order + presets)**
   - Label: mods, ui
   - Kapsam: -mod/-serverMod ayrimi, drag-drop siralama, preset profilleri.

## RCON
5. **Player manager**
   - Label: rcon, ui
   - Kapsam: player list, kick/ban/unban, whisper/global message, macros.
6. **Scheduler**
   - Label: rcon, infra
   - Kapsam: zamanli mesaj/restart/wipe day otomasyonu.
7. **Adapter secimi**
   - Label: rcon, infra
   - Kapsam: alternatif adapter, runtime secim ayari.

## Config Yonetimi
8. **serverDZ.cfg editor**
   - Label: ui, infra
   - Kapsam: parse + edit + save, validation, diff gorunumu.
9. **Profil/instance config**
   - Label: infra
   - Kapsam: instance config sync, clone/export/import.

## GameLabs / CFTools
10. **Token validity + rate limit + cache**
    - Label: cftools, infra
11. **Status/players/queue endpoints**
    - Label: cftools, ui
12. **Event/killfeed stream**
    - Label: cftools, ui
13. **Bans/whitelist management**
    - Label: cftools

## UX / UI
14. **Dashboard health cards**
    - Label: ui
15. **Log viewer filtre/search/export**
    - Label: ui
16. **Notification system**
    - Label: ui
17. **Role-based auth (opsiyonel)**
    - Label: ui, infra

## Dev / Ops
18. **CI: build + lint + unit tests**
    - Label: infra
19. **E2E smoke test (/health)**
    - Label: infra
20. **Issue template + PR checklist**
    - Label: infra
