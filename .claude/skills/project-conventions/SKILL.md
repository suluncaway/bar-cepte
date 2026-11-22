---
name: project-conventions
description: Bar Cepte'de kod yazarken uyulacak kurallar — çok platformlu paketleme, üretilmiş dosyalar, Türkçe arayüz, tasarım sistemi. Kod, CSS veya yeni dosya eklerken kullan.
user-invocable: false
---

## Paketleme (en sık unutulan)
Aynı web dosyaları üç yerde yaşar. Yeni bir kök dosya eklenince veya silinince:
- `web-assets.json` → Android (`android/app/build.gradle` bunu okur) ve masaüstü
- `package.json > build.files` → Electron
- `sw.js > PRECACHE_ASSETS` → çevrimdışı kabuk (uygulama kabuğunun parçasıysa)
Sonra `node scripts/check-assets.cjs`. Önbellekli bir dosya değişince `sw.js` `CACHE_NAME` sürümünü artır.

## Üretilmiş dosyalar
`tarif/*.html` ← `scripts/build-recipe-pages.js` + `cocktails.json`; `tailwind.css` ← `tailwind.input.css`. Kaynağı değiştir, build et.

## Kod stili
- Framework yok; düz tarayıcı JS, global modüller. Mevcut dosyanın kalıbını izle.
- Testler `tests/<modül>.test.cjs`, `node:test` + `node:assert/strict`. Davranış değişikliğine test ekle.
- Arayüz metinleri Türkçe, samimi "sen" diliyle.
- Gizli değerler `.env`'den gelir (`.env.example`'a bak); koda gömme.

## Tasarım
`DESIGN.md` bağlayıcıdır: koyu mürekkep zemin, düz iki renk baskı, glow/cam/gradient yok. Renkler token'dan (`--citrus` yalnızca aksiyon, `--mint` yapılabilir, `--cherry` eksik, `--night` AI, `--clay` alışveriş). Renkli dolgu üstünde koyu yazı, asla beyaz.
