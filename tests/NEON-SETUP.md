# Neon ve Render kurulumu

Neon ücretsiz PostgreSQL projesiyle Render ücretsiz servisi kullanılabilir; servis yeniden başlatılsa da satış ve kullanım kayıtları Neon'da kalır. Ücretsiz planların kota ve uyku sınırları hizmet sağlayıcılarına bağlıdır.

## İlk aktarım — eski servis henüz çalışırken

1. Eski `/licenses` sayfasını **Ctrl+S → yalnızca HTML** olarak bilgisayarınıza kaydedin. PDF ek bir görsel yedektir; veri aktarımı için HTML veya tam JSON gerekir. Müşteri verilerini ve kodları sohbete/genele açık depoya yüklemeyin.
2. `tools/neon-migration.html` dosyasını indirip kendi bilgisayarınızda tarayıcıyla açın. İnternet bağlantısı kullanmaz. HTML tablosunu seçin ve SQL dosyasını indirin. Eski tablonun satır sayısıyla araçtaki satış sayısını karşılaştırın.
3. Neon projesinde **SQL Editor** açıp SQL dosyasını çalıştırın. İşlem tek transaction'dır; hata halinde kısmi aktarım yapılmaz. Mevcut kayıtlar üzerine yazılmaz.
4. Sayıları kontrol edin:
   ```sql
   SELECT count(*) AS sales FROM barcepte_sales;
   SELECT count(*) AS claims FROM barcepte_claims;
   SELECT count(*) AS needs_review FROM barcepte_claims WHERE payload->>'needsReview' = 'true';
   ```

**Eski HTML tablosunda UID/deviceId ve kesin bitiş tarihi yoktur.** Kullanılmış kodlar aktarımda `needsReview=true` ile kilitlenir; hak sahipliği/süre uydurulmaz ve kod yeniden satılmaz/aktive edilmez. Tam geçmiş geri kazanılmış sayılmaz. Etkilenen müşterinin eski yerel üyeliği geçerli süresi boyunca çalışmaya devam eder; yeni cihazda geri yükleme için işletmeci önce orijinal kullanıcı/cihaz kimliği ve süreyi güvenilir bir yedekten doğrulamalıdır. Bu bilgi yoksa bireysel destek gerekir.

Tam `sold_licenses.json` + `claimed_licenses.json` dosyaları mevcutsa bunları `{ "version": 1, "sold": [...], "claimed": {...} }` biçiminde birleştirin. Araç JSON'u da kabul eder ve orijinal sahipliği/süreyi korur. Yerel CLI alternatifi: `npm run import:licenses -- /gizli/yedek.json` (`DATABASE_URL` ortamda tanımlı olmalı).

## Render ortamı

Neon **Connect** ekranından **pooled connection** PostgreSQL URI'sini alın. Parola içeren adresi yalnızca Render servisinin Environment alanına `DATABASE_URL` olarak kaydedin. Kod uzaktaki PostgreSQL bağlantılarında TLS sertifikasını doğrular; doğrulama devre dışı bırakılmaz.

Ayrıca şunları tanımlayın:

- `NODE_ENV=production`
- `LICENSE_MIGRATION_COMPLETE=false` (aktarımı doğrulayana kadar)
- `ADMIN_TOKEN`: parola yöneticisiyle üretilmiş güçlü yönetim parolası
- `WEBHOOK_TOKEN`: ayrı güçlü gizli değer (callback kullanılmıyorsa tanımlanmayabilir; callback erişimi kapalı kalır)
- `SHOPIER_API_TOKEN`: yenilenmiş Shopier erişim anahtarı
- `RESEND_API_KEY`: mevcut e-posta anahtarı

Render Start Command: `npm run start:webhook`. Build Command: `npm ci --omit=dev --ignore-scripts`. Health Check Path: `/health`.

Önce SQL aktarımı ve sayım tamamlanmalıdır. Ardından yeni kodu yayınlayın. `/health` içinde `storage=postgres` görünmeli. `migrationRequired=true` iken aktivasyon/callback ve otomatik sipariş üretimi durur; eski siparişlere yeniden kod üretmez. Kontrollerden sonra Render'da `LICENSE_MIGRATION_COMPLETE=true` kaydedilip servis yeniden başlatılır.

Son kontrolde `/health`: `storage=postgres`, `migrationRequired=false`, `autoPolling=true` olmalı. `/licenses` yönetim kullanıcı adı `admin`, parolası `ADMIN_TOKEN` ile açılır. Gelecek yedekler için kimliği doğrulanmış `/api/export-licenses` tam JSON'u indirir. Bu yedeği de güvenli saklayın.

PostgreSQL bağlantısı kesilirse sistem geçici dosya deposuna dönmez; sağlıksız/başarısız sonuç verir. Üretimde DATABASE_URL yoksa başlangıç reddedilir. Yerel geliştirmede JSON dosyası desteği korunur.
