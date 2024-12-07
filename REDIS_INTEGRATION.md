# Redis ve BullMQ Entegrasyon Planı

## Hedef
API endpoint'lerini Redis ve BullMQ ile entegre ederek asenkron iş yönetimi ve önbellekleme yetenekleri kazandırmak.

## Yapılacaklar Listesi

### 1. Altyapı Kurulumu
- [x] Redis kurulumu ve test edilmesi
- [x] BullMQ ve gerekli paketlerin yüklenmesi
```bash
npm install @bull-board/api @bull-board/ui bullmq ioredis
```
- [x] Environment değişkenlerinin eklenmesi
  - REDIS_HOST
  - REDIS_PORT
  - REDIS_PASSWORD (opsiyonel)

### 2. Queue Yapılandırması
- [x] Queue yapılandırma modülünün oluşturulması (`lib/queue/config.ts`)
- [x] Queue tipleri:
  - [x] Analytics Queue (analitik veri işleme)
  - [x] BigQuery Queue (uzun süren sorgular)
  - [x] Rate Limit Queue (hız sınırlama)

### 3. Endpoint Entegrasyonları
- [x] `/api/job` endpoint'i için queue entegrasyonu
  - [x] `/api/job/status` - İş durumu sorgulama
  - [x] `/api/job/result` - İş sonucu alma
- [x] `/api/analytics` için asenkron veri işleme
- [x] `/api/bigquery` için uzun süren sorgu yönetimi
- [x] `/api/query` için sorgu kuyruğu entegrasyonu
- [x] `/api/rate-limits` için Redis rate limiting

### 4. Monitoring ve Yönetim
- [x] Bull Board kurulumu
  - [x] `/api/bull-board` endpoint'i
  - [x] Bull Board UI sayfası
  - [x] Güvenlik middleware'i
- [x] Hata yönetimi ve loglama sistemi
  - [x] Özel hata sınıfları
  - [x] Hata loglama mekanizması
  - [x] Retryable/NonRetryable hata ayrımı
- [x] Retry mekanizması yapılandırması
  - [x] Queue bazlı retry stratejileri
  - [x] Otomatik retry yönetimi
  - [x] Job temizleme politikaları

## İlerleme Notları
<!-- Her değişiklik için buraya tarih ve yapılan işlem eklenecek -->
- **2024-02-12**: Redis kurulumu tamamlandı ve test edildi. BullMQ ve gerekli paketler yüklendi.
- **2024-02-12**: Redis environment değişkenleri .env.local dosyasına eklendi.
- **2024-02-12**: Queue yapılandırması tamamlandı. Üç farklı queue tipi (analytics, bigquery, rate-limit) için gerekli dosyalar oluşturuldu.
- **2024-02-12**: Tüm endpoint'ler BullMQ ile entegre edildi:
  - Analytics endpoint'i asenkron veri işleme için güncellendi
  - BigQuery endpoint'i uzun süren sorgular için queue sistemi ile entegre edildi
  - Rate limit endpoint'i Redis ve queue sistemi ile entegre edildi
  - Query endpoint'i sorgu kuyruğu ile entegre edildi
  - Job status ve result endpoint'leri oluşturuldu
- **2024-02-12**: Bull Board monitoring sistemi kuruldu:
  - Queue monitör UI'ı oluşturuldu (/bull-board)
  - API endpoint'i ve güvenlik katmanı eklendi
- **2024-02-12**: Hata yönetimi ve retry mekanizması eklendi:
  - Özel hata sınıfları ve loglama sistemi oluşturuldu
  - Queue bazlı retry stratejileri tanımlandı
  - Job temizleme politikaları belirlendi

## Mevcut Endpoint'ler
- `/api/analytics`: Analitik verileri
- `/api/bigquery`: BigQuery entegrasyonu
- `/api/job`: İş/görev yönetimi
- `/api/job/status`: İş durumu sorgulama
- `/api/job/result`: İş sonucu alma
- `/api/query`: Sorgu işlemleri
- `/api/rate-limits`: Hız sınırlamaları
- `/api/settings`: Ayarlar
- `/api/test-connection`: Bağlantı testi
- `/api/bull-board`: Bull Board UI

## Önemli Notlar
- Redis bağlantısı her zaman kontrol edilmeli
- Queue'lar için retry politikaları belirlenmeli
- Rate limiting stratejisi için threshold değerleri belirlenmeli
- Error handling için detaylı loglama yapılmalı

## Performans Hedefleri
- Queue işlem süresi: < 100ms
- Rate limit tepki süresi: < 10ms
- Redis bağlantı havuzu: max 50 bağlantı
