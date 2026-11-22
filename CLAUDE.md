# Bar Cepte — Claude rehberi

Akıllı bar & kokteyl asistanı. Tek web kod tabanı; aynı dosyalar **web/PWA** (GitHub Pages, barcepte.com.tr), **Electron** (`main.js`, `desktop-server.js`) ve **Android WebView** (`android/`) olarak paketlenir.

## Komutlar
- `npm test` — tüm Node testleri (`node --test tests/*.test.cjs`, ~1 sn)
- `node scripts/check-assets.cjs` — paketlenecek dosya listesini doğrular
- `npm run build:css` — `tailwind.input.css` → `tailwind.css`
- `npm run build:recipes` — `cocktails.json` → `tarif/*.html`
- Önizleme: `node scripts/preview.cjs` (port 47832)

## Kurallar
- Arayüz metinleri Türkçe. Tasarım: `DESIGN.md`, ürün: `PRODUCT.md`.
- `tarif/*.html` ve `tailwind.css` **üretilmiş** dosyalardır; elle düzenleme, kaynağı değiştirip build et.
- Yeni bir kök dosya (JS/CSS/HTML/görsel) uygulamaya giriyorsa: `web-assets.json` (Android+masaüstü), `package.json > build.files` ve gerekiyorsa `sw.js` `PRECACHE_ASSETS` güncellenir.
- Önbelleğe alınan bir dosya değişirse `sw.js` içindeki `CACHE_NAME` sürümünü artır.
- `.env*`, `keys/`, imza/anahtar dosyaları okunmaz ve düzenlenmez. Canlı ödeme/lisans işlemi yapılmaz.
- Lisans, ödeme (Shopier), kimlik ve `security.js` değişikliklerinde `security-reviewer` ajanını çalıştır.
- Rastgele değer için `crypto` kullan, `Math.random()` değil.
