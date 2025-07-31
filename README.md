# DayZTR Web Sitesi

Bu depo, DayZTR sunucusu için hazırlanan basit bir web sitesini içerir. Node.js ve Express kullanarak blog yazılarını yönetebileceğiniz küçük bir API sağlar.

## Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   npm install express
   ```
2. Uygulamayı başlatın:
   ```bash
   node server.js
   ```
3. Site `http://localhost:3000` adresinde çalışacaktır.

## Dosya Yapısı

- `public/` - Statik dosyalar (HTML, CSS ve JS)
- `data/posts.json` - Blog yazılarının tutulduğu dosya
- `server.js` - Express uygulaması

Admin paneli üzerinden yeni gönderiler ekleyebilir, ana sayfada yayınlanan güncellemeleri görüntüleyebilirsiniz.
