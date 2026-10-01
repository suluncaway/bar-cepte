<div align="center">

# 🍸 Bar Cepte

**Akıllı Bar & Kokteyl Asistanı** — Elindeki malzemeleri seç, hangi kokteylleri yapabileceğini anında gör.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/suluncaway/bar-cepte?label=son%20s%C3%BCr%C3%BCm)](https://github.com/suluncaway/bar-cepte/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/suluncaway/bar-cepte/total?label=indirme)](https://github.com/suluncaway/bar-cepte/releases)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20Android%20%7C%20Web-blueviolet)](#-i̇ndirme)

</div>

---

## ✨ Özellikler

- 📚 **600+ kokteyl** veritabanı (TheCocktailDB)
- 🧠 **Akıllı eşleştirme** — seçtiğin malzemelerle yapabileceğin tarifleri bulur
- 💡 **"Bunu alırsan +X tarif açılır"** tavsiye motoru
- 🍹 **Alkollü / alkolsüz** ve **tat** (sert, tatlı, ekşi, ferah) filtreleri
- ❤️ **Favoriler** ve ✨ **kendi tarifini ekleme** (fotoğraflı)
- 🛒 Eksik malzemeler için **alışveriş listesi**
- 👥 **Porsiyon hesaplayıcı** — 1x / 2x / 4x / 8x parti
- 🖼️ Tariflerde **Türkçe hazırlanış çevirisi**
- ⚙️ **Yedekleme & aktarma** (cihazlar arası)
- 💡 Barmen modu (ekran uyanık kalma)
- 📲 **PWA** — tarayıcıya kurulum, çevrimdışı destek

---

## ⚡ İndirme

> En güncel yükleyiciler otomatik olarak **GitHub Releases** üzerinde yayınlanır.
> 👉 **[Son sürümü indir](https://github.com/suluncaway/bar-cepte/releases/latest)**

| Platform | Dosya |
| :---: | :--- |
| 🪟 **Windows** | `Bar Cepte Setup 1.0.0.exe` (kurulum) · `Bar Cepte 1.0.0.exe` (taşınabilir) |
| 🐧 **Linux** | `Bar Cepte 1.0.0.AppImage` · `bar-cepte_1.0.0_amd64.deb` |
| 🤖 **Android** | `BarCepte-Debug-APK` (Actions artifact'i) |
| 🌐 **Web / PWA** | Doğrudan `index.html` (herhangi bir statik sunucuda çalışır) |

**Tüm platformlar için:** [Releases sayfası](https://github.com/suluncaway/bar-cepte/releases)

---

## 🚀 Hızlı Başlangıç (Geliştirici)

### 🌐 Web sürümünü çalıştır
```bash
# Herhangi bir statik sunucuyla örn:
npx serve .
# veya Python:
python -m http.server 8000
```

### 🖥️ Masaüstü (Electron)
```bash
npm install
npm start          # geliştirme modu
npm run dist       # Windows/Linux yükleyicilerini üret
```

### 🤖 Android
Proje `android/` klasöründe standart bir Gradle projesidir. APK derlemek için:
```bash
cd android
gradle assembleDebug
```

---

## 🧰 Teknoloji Yığını

- **Arayüz:** HTML + [Tailwind CSS](https://tailwindcss.com) (CDN) + Vanilla JS
- **Veri:** [TheCocktailDB](https://www.thecocktaildb.com/api.php) REST API, IndexedDB + localStorage ile önbellek
- **PWA:** Service Worker ile çevrimdışı destek
- **Masaüstü:** [Electron](https://www.electronjs.org) + [electron-builder](https://www.electron.build)
- **Android:** WebView sarmalayıcı (Java)
- **CI/CD:** GitHub Actions (masaüstü + Android derlemesi)

---

## 📁 Proje Yapısı

```
bar-cepte/
├── index.html              # Arayüz (tek sayfa)
├── game.js                 # Tüm uygulama mantığı
├── style.css               # Tema ve stiller
├── manifest.json           # PWA manifesti
├── sw.js                   # Service Worker
├── main.js                 # Electron ana süreç
├── package.json            # Electron + electron-builder
├── build/                  # Uygulama ikonları
├── android/                # Android (WebView) projesi
└── .github/workflows/      # CI (masaüstü + APK)
```

---

## 📄 Lisans

[MIT](LICENSE) © 2026 [suluncaway](https://github.com/suluncaway)

