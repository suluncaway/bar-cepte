# Hata inceleme ve uygulama raporu — 15 Ekim 2026

## Uygulanan plan

1. Proje, mevcut testler, masaüstü/Android paketleme ve lisans akışını incele.
2. Eksik platform dosyalarını ve Android yerel veri erişimini düzelt.
3. Merkezi lisans denetimi ve webhook erişim açıklarını kapat.
4. Gerçek API regresyonları, CSS derlemesi ve tarayıcı kontrolleriyle doğrula.

## Düzeltilen sorunlar

- Electron paketinde auth.js, firebase-config.js, privacy.js, ikon ve video gibi gerekli dosyalar eksikti. `web-assets.json` artık paketleme ve yerel sunucunun ortak dosya listesi.
- Android'in elle kopyalanmış eski arayüzü gerekli güvenlik, CSS ve UI dosyalarını içermiyordu. Eski kopyalar kaldırıldı; Gradle `syncWebAssets` ile ortak listedeki güncel dosyaları derlemede alıyor.
- Android `file://` origininden JSON fetch işlemi engellenebiliyordu. WebViewAssetLoader ile uygulama içeriği `https://appassets.androidplatform.net/assets/` üzerinden sunuluyor; dosya erişimi kapalı.
- Lisans sunucusuna bağlantı/JSON hatası yeni üyeliği yerelden açıyordu. Artık başarısız sonuç döner; istek zaman aşımına sahiptir. Sunucudan eksik/bozuk süre geldiğinde aylık üyelik süresiz üyeliğe dönüşmez.
- Yayımlanmış master kodları merkezi aktivasyonu atlayabiliyordu. Merkezi akış bu ayrıcalığı kaldırır; sağlama toplamı doğru olsa bile satış kayıtlarında bulunmayan kod reddedilir.
- Kalıcı kayıt yazılamadığında API başarı dönüyordu. Artık 503 döner; bozuk claim verisiyle yeni hak tanınmaz ve claim dosyası atomik değiştirilir.
- Yönetim paneli ve tekrar e-posta uçları açıktı. Basic kimlik doğrulaması eklendi; GET ile e-posta gönderimi kaldırıldı. Callback için ayrı Bearer token gerekir; yapılandırılmazsa erişim kapalıdır.
- Kaynak kodundaki Shopier erişim anahtarı ve örnek müşteri/satış kayıtları kaldırıldı. Lisans rastgeleliği `crypto.randomInt` kullanır.
- Tek kullanımlık lisans testi üretim sunucusunu test etmiyordu. Artık geçici veri dizini ve rastgele port ile gerçek handler çalışır.

## Doğrulama

- `npm test`: 53 test başarılı. Tek kullanımlık hak, başka kullanıcı reddi, süreyi koruyan geri yükleme, süresi dolmuş lisans, bozuk kayıt, yetkisiz admin/callback, kayıt dışı kod ve bağlantı hataları kontrol edildi.
- `npm run build:css`: başarılı.
- `npm audit --omit=optional --audit-level=moderate`: 0 açık.
- Chromium: yerel tarif kartları, Mojito araması, dil değiştirme, sayaç açma/Escape, Reserve modalı ve 375px yatay taşma kontrolü başarılı. Yerel dosya 404'ü ve JavaScript sayfa istisnası yok. Üçüncü taraf ağ istekleri bu testte kapalıydı; OAuth, reklam veya ödeme doğrulanmadı.
- Android SDK/Gradle bulunmadığından APK derlemesi ve cihaz testi yapılmadı. Electron kurulum paketleri/native çalışma doğrulanmadı.

## Yayın öncesi gerekli yapılandırma

- Git geçmişine girmiş Shopier erişim anahtarını Shopier'de iptal edip yenileyin. Sadece dosyadan silmek iptal etmez. Yeni değeri `SHOPIER_API_TOKEN` olarak sunucuya verin.
- `.env.example` alanlarını hosting ortamında yapılandırın; uygulama `.env` dosyasını kendiliğinden okumaz. Yönetim panelinde kullanıcı adı `admin`, parola `ADMIN_TOKEN` olabilir. Yalnız HTTPS üzerinden kullanın.
- Callback isteği `Authorization: Bearer <WEBHOOK_TOKEN>` taşımalıdır. Bu başlığı desteklemeyen doğrudan Shopier callback'i yerine yapılandırılmış Shopier API polling akışını kullanın; yetkisiz callback'i tekrar açmayın. Polling için `SHOPIER_API_TOKEN` gerekir.
- `LICENSE_DATA_DIR` kalıcı diskte olmalı. Mevcut `sold_licenses.json` ve `claimed_licenses.json` dosyalarını birlikte yedekleyip taşıyın. Kaynak koda gömülü kayıtlar artık kullanılmaz; geçmiş satışlar bu dosyalara aktarılmadan yayın yapmayın. CLI ile kod üretmek tek başına satış kaydı oluşturmaz; manuel teslim edilmiş kodların da satış kayıtlarında bulunması gerekir.
- Android ilk açılışta eski `file://` localStorage verisini yeni HTTPS originine otomatik aktarır. Eski veri silinmez; hedefte mevcut değerler korunur. Kota hatasında kısmi yazım geri alınır ve sonraki açılışta tekrar denenir. Güncellemeden önce ek bir dışa aktarım yedeği alınması önerilir; cihaz üzerinde yükseltme testi ayrıca gereklidir.

## Kalan mimari sınırlar

- UID/deviceId istemciden geliyor; sunucu Google ID token doğrulamıyor. Hesap kimliğini güçlü biçimde doğrulamak için sunucuda token doğrulaması gerekir. Statik istemcide localStorage üyelik durumunu değiştirmek de engellenemez; ücretli sunucu özellikleri ayrıca yetkilendirilmelidir.
- “Bulut” eşitleme işlevleri mevcut yapılandırmada localStorage kullanıyor. Gerçek cihazlar arası hesap yedeği için kimliği doğrulanmış bir backend ve veri geçişi gerekir.
- JSON dosyası deposu tek sunucu süreci içindir. Birden fazla instance ve kalıcı disk kaybı için transaction destekli veritabanı gerekir. Bu çalışma canlı sunucuyu veya hesap yapılandırmasını değiştirmedi.

## Devam çalışması

- Android origin geçişi için otomatik, tekrar çalıştırılabilir veri taşıma ve iki regresyon testi eklendi.
- Android native dosyaları çevrimdışı sunduğundan WebView içinde PWA worker kaydı atlanır.
- Android ve Windows/Linux paket derlemeleri PR kontrollerine dahil edildi; yayın işi yalnız sürüm etiketiyle çalışır.
