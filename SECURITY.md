# Bar Cepte güvenlik notları

## Web düzeltmeleri

- HTML içi JavaScript olay işleyicileri kaldırıldı. Dinamik tarif ve alışveriş butonları parametreleri kod yerine veri olarak işliyor.
- CSP: aynı kaynaktan script ve kullanıcının açıkça istediği `https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js` dosyasına izin veriliyor. Diğer dış scriptler, inline script, olay öznitelikleri, eval, eklenti nesneleri ve form gönderimleri engelleniyor. Stil öznitelikleri mevcut arayüz ve widget için açık.
- Tailwind tarayıcı CDN scripti kaldırıldı; önceden derlenmiş yerel CSS kullanılıyor.
- Yedekler ve yerel tarifler tür, liste uzunluğu, alan boyutu ve kimlik açısından doğrulanıyor. İçe aktarma tüm alanlar doğrulanmadan uygulama durumunu değiştirmiyor; kullanıcı onayı istiyor.
- Bozuk/erişilemeyen localStorage başlangıcı durdurmuyor. Görsel kaynakları güvenilir görsel alanı ve raster data URL ile sınırlı.
- Güncelleme indirme bağlantıları yalnızca bu deponun GitHub Releases alanına yönleniyor. Web yenilemesinde javascript: URL kaldırıldı.
- Service Worker yalnızca uygulama dosyalarını ve sınırlı sayıda CocktailDB görselini önbelleğe alıyor. Uygulama kodu network-first; başka uygulamaların önbellekleri silinmiyor.
- Pages yayınından masaüstü araçları, testler, paket tanımları ve sertifika dizini çıkarıldı.

## Acil: eski imzalama anahtarı

Önceki sürümde özel imzalama dosyası ve parolası Git deposunda bulunuyordu. Güncel ağaçtan kaldırıldılar, ancak **Git geçmişinde ve kopyalarda hâlâ bulunabilirler**.

- Eski anahtarı ele geçirilmiş kabul edin; tekrar kullanmayın.
- Sağlayıcıdan alınmış sertifikaysa iptal sürecini sağlayıcıyla yürütün. Kendinden imzalıysa daha önce güvenilen cihazlarda eski sertifikaya verilen güven kaldırılmalıdır.
- Yeni özel anahtar oluşturun; dosyayı Git'e koymayın. İmzalama için güvenli CI secret değişkenlerini veya süreç ortamını kullanın.
- Eski `trust-cert.bat` otomatik güven eklemeyecek şekilde durduruldu.
- Git geçmişi yeniden yazılmadı; force-push yapılmadı. Geçmiş temizliği ayrıca onay ve koordinasyon gerektirir; anahtar değiştirmeye alternatif değildir.
- Eski imzalı EXE/APK yayımları bu web düzeltmesiyle değişmiş sayılmaz.

## Bağımlılıklar ve sınırlar

Electron 41.10.7 ve electron-builder 26.15.3 kullanılıyor. Derleme için Node.js 22.12+ gerekir. Tailwind CSS önceden derlenir; tarayıcı Node paketlerini çalıştırmaz.

Kontrol anında `npm audit --omit=dev` ve `npm audit --omit=optional` sıfır bulgu verdi. Tam denetimde, masaüstü paketleyicinin isteğe bağlı bağımlılık zincirinde 8 orta önem dereceli bulgu kaldı; kritik veya yüksek bulgu kalmadı. Bunları gizlemek için denetim kapatılmadı veya doğrulanmamış zorunlu sürüm değişikliği yapılmadı.

Bu çalışma kapsamlı sızma testi veya “tüm açıklar kapandı” garantisi değildir. GitHub hesap güvenliği, üçüncü taraf ödeme hesabı, Android SDK'ları ve masaüstü yükleyiciler ayrıca denetlenmelidir. GitHub Pages üzerinde özel HTTP güvenlik başlıkları ve iframe engelleme politikası bu değişiklikle uygulanmış sayılmaz.

## Destek bağlantısı

Eski `buymeacoffee.com/suluncaway` profili kontrol sırasında bulunamadı. Kullanıcının verdiği https://buymeacoffee.com/suluncau adresi 11 Ekim 2026 tarihinde açılarak doğrulandı ve `support.js` içindeki `SUPPORT_URL` değerine eklendi. Üst ve alt destek düğmeleri bu adresi `noopener,noreferrer` ile açar. Ödeme yapılmadı; ödeme işleminin tamamlanması test edilmedi.

Kullanıcının son talebi doğrultusunda alt düğme, gönderdiği özgün Buy Me a Coffee script etiketiyle birebir uygulanmıştır. Önceki yerel benzer görünümlü düğme kaldırıldı. CSP yalnızca belirtilen CDN dosyasına izin verir; üçüncü taraf script yüklemek bu sağlayıcının koduna güvenmeyi gerektirir. Widget'ın oluşturduğu yeni sekme bağlantısına ayrıca `noopener noreferrer` eklenir. Üst destek düğmesi mevcut doğrudan profil bağlantısını korur.

## Tekrarlanabilir kontroller

```sh
npm ci --ignore-scripts
npm test
npm run build:css
npm audit --omit=dev
npm audit --omit=optional
npm audit
```

`tests/QA.md` kullanıcı arayüzü ve olumsuz senaryo kontrol listesini içerir. Yeni bir imzalı masaüstü/Android sürümü bu işlem kapsamında dağıtılmadı.
