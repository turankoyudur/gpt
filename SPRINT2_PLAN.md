# Sprint 2 Plan — DayZ / SteamCMD / RCON / GameLabs kapsam büyütme

Bu sprint, Sprint-1’de stabil hale gelen “çalışır sürüm”ün üstüne özellik kapsamını genişletir.
Hedef: Omega Manager + CF Cloud benzeri panel deneyimine yaklaşmak.

---

## 0) Prensipler
- Mevcut dosya yapısı bozulmadan geliştirme (modüler)
- Her yeni büyük yetenek: `server/modules/<feature>` + UI page/component
- Her özellik: log + hata kodu + DB migration
- “Module health” yaklaşımı: bozuk entegrasyon paneli düşürmez, UI’da sağlık durumu gösterilir

---

## 1) SteamCMD / Workshop iyileştirmeleri
### 1.1 Workshop Search (UI)
- Workshop’da mod arama (text search)
- Sonuçlar: title, id, updated, size, required DLC info (varsa)
- “Add” butonu ile DB’ye ekle

### 1.2 Collection import
- Workshop Collection URL/ID gir
- İçindeki modları listele, tek tıkla ekle
- Modlar arası bağımlılıkları (varsa) raporla

### 1.3 Mod “install pipeline”
- Queue sistemi: aynı anda x mod indir
- İndirme durumlarını UI’da progress olarak göster
- Başarısız modlar için retry

### 1.4 Launch arg builder
- `-mod=...` / `-serverMod=...` ayrımı
- UI’dan sıralama (drag drop)
- Profil bazlı preset (PvP, PvE, Hardcore vb.)

---

## 2) RCON geliştirmeleri
### 2.1 RCON UI: Player manager
- Player list (players)
- Kick/Ban/Unban
- Whisper / global message
- Komut presetleri (macro buttons)

### 2.2 Scheduler
- Zamanlı mesajlar
- Zamanlı restart
- “wipe day” otomasyonu (log + confirmation)

### 2.3 Adapter iyileştirmesi
- Eğer `battle-node-v2` npm paketi kararsızsa:
  - Alternatif RCON client adapter (aynı interface)
  - Runtime seçim: Settings’ten adapter seç

---

## 3) Config yönetimi genişletme
### 3.1 `serverDZ.cfg` editör
- UI’dan parse+edit+save
- Validate (port range, hostname length, etc.)
- Farkları (diff) göster

### 3.2 Profil / instance config
- `instances/<id>/config.json` + DB sync
- Instance clone / export / import

---

## 4) GameLabs / CFTools kapsamı
> Not: API yetkileri kullanıcı aboneliğine göre değişebilir.
> Hedef: panelde entegre “server analytics + moderation + queue” deneyimi.

### 4.1 Core
- Token validity check
- Rate limit + cache
- Webhook receiver (event ingest) (opsiyonel)

### 4.2 Features (kademeli)
- Online players + last seen
- Killfeed/Events stream
- Bans / whitelist yönetimi
- Priority queue yönetimi
- Server status dashboard (uptime, restarts, errors)

---

## 5) UX / UI geliştirmeleri
- Dashboard: “health cards” (SteamCMD ok, DayZ path ok, RCON ok, CFTools ok)
- Log viewer: filter, search, export
- Notification system: toast + persistent alerts
- Role-based auth (opsiyonel): admin/operator/viewer

---

## 6) Dev süreç
- GitHub Issues + Milestones
- PR template + checklists
- CI: build + lint + unit tests
- E2E smoke test: start server and hit /health

---

## 7) Çıktı
- Milestone “Sprint-2”
- Issue list (work breakdown) + labels
- PR’lar: küçük ve test edilebilir parçalara bölünmüş
