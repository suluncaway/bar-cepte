# Bar Cepte düzeltme planı

## Başlangıç
- Mevcut kullanıcı değişiklikleri korunacak; Git reset/checkout yapılmayacak.
- Başlangıç testi: 47 test, 42 başarılı, 5 başarısız.
- Gizli `.env` / `keys` verileri incelenmeyecek; canlı ödeme/hesap işlemi yapılmayacak.

## Sıra
1. Üyelik/oturum hatalarını ve eski güvenlik beklentilerini ayır; gerçek sunucu doğrulaması için regresyon ekle.
2. Service Worker ağ/önbellek hata davranışını test et ve düzelt.
3. Android'in eksik/eski kopyalar yerine güncel web kaynaklarını paketlemesini sağla.
4. Tüm Node testlerini ve JavaScript sözdizimini doğrula; mümkünse yerel tarayıcı kontrolü yap.
5. Sonuçları, kalan kurulum/native derleme gereksinimlerini kaydet.

## Tespitler
- Lisans API testi gerçek uygulama yerine testin içindeki güvensiz sahte sunucuyu test ediyor.
- Eski döviz testi artık olmayan, başlıktan ödeme planı tahmin eden işlevi bekliyor. Doğrulanmamış ödeme callback'leri kapalı kalmalı.
- Android assets dizininde kök HTML'in ihtiyaç duyduğu bazı JS/CSS dosyaları yok ve kimlik/lisans dosyaları eski.
- Service Worker cache yazması başarısız olduğunda başarılı ağ yanıtını kaybediyor; sunucu 5xx dönerse kayıtlı çevrimdışı içeriği kullanmıyor.
- Ön yüz `dev_` önekli cihaz kimliği gönderirken API saf hex bekliyor. Ön yüz yeni 48-hex lisansları kabul etmiyor.
- Eski lisans üretici tahmin edilebilir `Math.random()` kodları oluşturuyor; bunları gerçek sunucu envanterine kaydetmiyor.

## Uygulanan düzeltmeler
- Reserve DOM erişimi korunuyor; depolama başarısızsa üyelik etkinleşmiyor.
- Cihaz sırrı değiştirilmeden API payload'ında normalize ediliyor; yeni güvenli lisans biçimi kabul ediliyor. Eski biçim yalnızca biçim kontrolü olarak korunuyor; yetkilendirme sunucuda.
- CLI, sunucunun kriptografik anahtar üreticisini kullanıyor. Önizleme açıkça işaretli; `--save` aynı atomik envantere kayıt yapıyor. Eski metin çıktıları ezilmiyor.
- Sahte API testi kaldırıldı. Gerçek localhost API, geçici sentetik depo ve CLI → ön yüz → API sözleşme testi eklendi.
- Service Worker ağ yanıtını cache arızasından koruyor, 5xx için önbelleğe dönebiliyor, kısmi video yanıtını cache'e yazmıyor. Cache sürümü v32.
- Android Gradle, güncel kök dosyalardan açık izin listesiyle paket oluşturuyor; eski kopyalar silinmeden devreden çıkarılıyor.
- Asset doğrulayıcı ve testleri `npm test` / `npm run check:assets` komutlarına bağlandı.

## Son doğrulama
- `npm test`: **69 başarılı, 0 başarısız**.
- `npm run check:assets`: **22 kaynak ve statik referanslar tutarlı**.
- Kök/scripts/backend/tests içindeki **28 JS/CJS dosyası** sözdizimi kontrolünden geçti.
- `git diff --check`: whitespace hatası yok.
- `npm audit --omit=dev`: **0 bulgu**.
- Tam `npm audit`: geliştirme/masaüstü paketleme bağımlılık zincirinde **8 orta**, **0 yüksek/kritik** bulgu. Önerilen electron-builder geri sürümüne otomatik geçilmedi; native paketleme doğrulanmadan bu değişiklik güvenli kabul edilmedi.

## Açık kalanlar / sınırlar
- Gerçek tarayıcı QA aracı sağlayıcı kimlik doğrulamasında 401 verdi; görsel, mobil ve tarayıcı çevrimdışı kontrolü yapılamadı. Node testleri bunların yerine geçtiği iddia edilmez.
- Android SDK/JDK/Gradle hazır değil; APK derlenmedi. Electron installer/masaüstü çalışma zamanı da doğrulanmadı.
- Canlı Google giriş, ödeme, e-posta ve lisans servisinin dağıtım ayarları test edilmedi. Doğrulanmamış ödeme teslimatı kapalı kalıyor.
- Mevcut kullanıcı değişiklikleri korundu; commit/push veya canlı dağıtım yapılmadı. Gerçek `.env` ve `keys` verileri okunmadı/değiştirilmedi.
- Bu çalışma doğrulanmış hata düzeltmeleridir; uygulamanın bütün olası hatalarının bittiği veya üretime koşulsuz hazır olduğu anlamına gelmez.
