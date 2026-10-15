# Doğrulanmış hesap ve bulut yedeği

Google girişindeki ID token sunucuda Google'ın RSA anahtarlarıyla doğrulanır. Uygulamanın istemci kimliği, token süresi, issuer ve doğrulanmış e-posta kontrol edilir. Ardından 30 günlük, iptal edilebilir bir oturum oluşturulur; veritabanına yalnız token özeti yazılır. İstemciden gönderilen UID ve e-posta yetki vermez.

`GOOGLE_CLIENT_ID` isteğe bağlıdır; tanımlanmazsa `firebase-config.js` içindeki mevcut Google istemci kimliği kullanılır. Google Console'daki izin verilen web originleri kullanılan alan adlarıyla eşleşmelidir. Gerçek Google girişini kullanıcı kendi hesabıyla tamamlamalıdır.

## Hesap verisi

- `POST /api/auth/google`: `{credential}` ile giriş.
- `POST /api/auth/logout`: mevcut Bearer oturumunu iptal etme.
- `GET /api/account`: doğrulanmış profil ve sunucudaki üyelik.
- `GET /api/account/backup`: hesabın yedeği ve sürümü.
- `PUT /api/account/backup`: `{data, revision}` ile yazma. Eski sürüm 409 alır; başka cihazdaki yeni veriyi ezmez.

Yedekte favoriler, özel tarifler, alışveriş listesi ve seçili malzemeler bulunur. Üyelik yedekten yüklenmez; lisans kayıtlarından okunur. Geri yükleme öncesinde cihazda tek bir kurtarma kopyası saklanır. Çıkış yapılan hesaba ait gecikmiş cevaplar uygulanmaz. Misafir modu yalnız yereldir.

PostgreSQL deposu başlangıçta mevcut satışlara dokunmadan `barcepte_sessions`, `barcepte_backups` tablolarını ve claim UID indeksini oluşturur. Veritabanı değişikliği önce ayrı Neon QA dalında sınanır. Yönetim panelinin lisans JSON dışa aktarımı satış ve kullanım kayıtlarını kapsar; hesap yedeklerinin tamamı için Neon veritabanı yedeği gerekir.

## Sipariş ve eski lisanslar

Callback içeriği ödeme kanıtı sayılmaz: sunucu belirtilen siparişi Shopier API'den okur. Yalnız ödenmiş, iptal/iade edilmemiş ve yapılandırılmış ürün içeren siparişten kod üretilir. Kod e-postadan önce kaydedilir; teslimat kilidi ve Resend idempotency anahtarı eşzamanlı/tekrar çağrıları sınırlar. E-posta başarısızlığında aynı kodla yeniden denenir. Çoklu pass siparişleri elle inceleme gerektirir.

Eski kullanılan lisanslar için satın alma e-postasıyla eşleşen doğrulanmış Google hesabı ve yönetici tarafından özgün kayıttan aktarılan `recoveryProof` birlikte gerekir. İlk kullanım/bitiş tarihleri korunur; süresi dolmuş veya kanıtı eksik kayıt açılmaz. Müşteri verisi kaynak depoya eklenmez.

## Doğrulama sınırları

Otomatik testler sağlayıcı cevapları ve e-posta gönderimini taklit eder; ücret tahsil etmez ve gerçek e-posta göndermez. İki ayrı auth.js istemcisi aynı hesap yedeğini sunucudan geri yükler. CI, PostgreSQL üzerinde eşzamanlı işlemleri ve Android emülatöründe eski APK'dan yeni APK'ya veri geçişini sınar. Fiziksel cihaz ve gerçek OAuth/ödeme/e-posta teslimi ayrıca kontrol edilmelidir. Statik istemcide yerel üyelik göstergesi değiştirilebilir; ücretli sunucu işlemlerinin yetkisi daima sunucudan alınmalıdır.

Shopier siparişleri resmi `limit=50&page=N` sayfalamasıyla taranır. API varsayılan olarak son 60 günü döndürür; daha eski eksik kayıtlar yönetici aktarımı gerektirir. Kaynaklar: [Sipariş listesi](https://developer.shopier.com/reference/get-orders), [Sayfalama](https://developer.shopier.com/reference/pagination). Ücretsiz Render servisinin uyanmasına fırsat vermek için istemci zaman aşımı 65 saniyedir.

Gerçek e-posta kontrolü yalnız işletmecinin açıkça ayarladığı `EMAIL_SMOKE_TEST_TO`, benzersiz `EMAIL_SMOKE_TEST_ID` ve en fazla bir saatlik `EMAIL_SMOKE_TEST_UNTIL` (epoch milisaniye) değerleriyle başlar. Aynı Resend idempotency anahtarı tekrar gönderimi önler; kontrol bitince bu değişkenler boşaltılır. Mesaj ödeme/üyelik oluşturmaz. Sağlayıcının teslimat olayı sunucu loguna yazılır. Otomatik testlerde bu gönderim de taklit edilir.
