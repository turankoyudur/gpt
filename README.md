# DayZTR Web Sitesi

Bu depo, DayZTR sunucusu için hazırlanan basit bir web sitesini içerir. Node.js ve Express kullanarak blog yazılarını yönetebileceğiniz küçük bir API sağlar. Veriler artık **MySQL** veritabanında tutulur.

## Kurulum

1. Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```
2. MySQL veritabanını oluşturun ve `data/schema.sql` dosyasını çalıştırın:
    ```bash
    mysql -u <kullanıcı> -p < data/schema.sql
    ```
3. Ortam değişkenlerini ayarlayın:
    ```bash
    export DB_HOST=localhost
    export DB_USER=<kullanıcı>
    export DB_PASS=<şifre>
    export DB_NAME=dayztr
    ```
4. Uygulamayı başlatın:
    ```bash
    node server.js
    ```
5. Site `http://localhost:3000` adresinde çalışacaktır.

## Dosya Yapısı

- `public/` - Statik dosyalar (HTML, CSS ve JS)
- `data/schema.sql` - Veritabanı tablo tanımı
- `server.js` - Express uygulaması

Admin paneli üzerinden yeni gönderiler ekleyebilir, ana sayfada yayınlanan güncellemeleri görüntüleyebilirsiniz.
