---
name: release-check
description: Bar Cepte yeni sürüm öncesi kontrol listesi — build, asset listesi, service worker önbellek sürümü, testler ve sürüm numarası.
disable-model-invocation: true
argument-hint: "[yeni-sürüm, ör. 1.2.0]"
---

Yeni sürüm hazırlığı ($ARGUMENTS). Sırayla yap, her adımın sonucunu raporla; bir adım başarısızsa dur ve bildir.

1. `git status` temiz mi, hangi dosyalar değişti? (`git diff --stat origin/main...HEAD`)
2. `npm run build:css` ve `cocktails.json`/`scripts/build-recipe-pages.js` değiştiyse `npm run build:recipes`. Ortaya çıkan diff'i özetle.
3. Değişen kök dosyalar `web-assets.json` ve `package.json > build.files` içinde mi? `node scripts/check-assets.cjs` çalıştır.
4. Önbelleğe alınan dosyalar değiştiyse `sw.js` içindeki `CACHE_NAME` sürüm numarasını bir artır (ör. `bar-cepte-v93-shell` → `v94`).
5. `npm test` — tümü geçmeli. Başarısız test varsa listele.
6. Sürüm verildiyse `package.json` `version` alanını ve varsa `android/app/build.gradle` `versionName`/`versionCode` değerlerini güncelle.
7. Kısa Türkçe sürüm notu taslağı yaz (`git log` üzerinden, kullanıcıya görünen değişiklikler önce).

Commit, tag veya push yapma; sadece hazırlayıp raporla.
