// Privacy Policy & 18+ Notice Internationalization (TR/EN)
// Both languages live in privacy.html (#privacy-content-tr / #privacy-content-en); this file only switches them.
(function () {
    const I18N_PRIVACY = {
        tr: {
            title: "Gizlilik Politikası & 18+ Yasal Uyarı — Bar Cepte",
            back: "← Bar Cepte'ye Dön",
            h1: "<i class='bci bci-shield' aria-hidden='true'></i> Gizlilik Politikası & 18+ Yasal Uyarı",
            updated: "Son güncelleme: Kasım 2026",
            nav: ["Uygulama", "Tarifler", "Rehberler", "Hakkımızda", "İletişim"],
            footer: "&copy; 2026 Bar Cepte — Tüm hakları saklıdır."
        },
        en: {
            title: "Privacy Policy & 18+ Legal Notice — Pocket Bar",
            back: "← Back to Pocket Bar",
            h1: "<i class='bci bci-shield' aria-hidden='true'></i> Privacy Policy & 18+ Legal Notice",
            updated: "Last updated: November 2026",
            nav: ["App", "Recipes", "Guides", "About", "Contact"],
            footer: "&copy; 2026 Pocket Bar — All rights reserved."
        }
    };

    function getLang() {
        try {
            const saved = localStorage.getItem('bar_cepte_lang') || localStorage.getItem('bar_language');
            return saved === 'en' ? 'en' : 'tr';
        } catch (e) {
            return 'tr';
        }
    }

    function applyLang(lang) {
        const t = I18N_PRIVACY[lang] || I18N_PRIVACY.tr;
        document.title = t.title;
        document.documentElement.lang = lang === 'en' ? 'en' : 'tr';

        const backLink = document.getElementById('privacy-back-link');
        if (backLink) backLink.textContent = t.back;

        const h1 = document.getElementById('privacy-h1');
        if (h1) h1.innerHTML = t.h1;

        const updated = document.getElementById('privacy-updated');
        if (updated) updated.textContent = t.updated;

        const nav = document.querySelectorAll('#privacy-site-nav a');
        nav.forEach((link, index) => { if (t.nav[index]) link.textContent = t.nav[index]; });

        const tr = document.getElementById('privacy-content-tr');
        const en = document.getElementById('privacy-content-en');
        if (tr) tr.hidden = lang === 'en';
        if (en) en.hidden = lang !== 'en';

        const footer = document.getElementById('privacy-footer');
        if (footer) footer.innerHTML = t.footer;

        const langBtn = document.getElementById('privacy-lang-toggle');
        if (langBtn) {
            langBtn.innerHTML = lang === 'en'
                ? '<span class="text-slate-400 font-medium">TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-amber-300 font-black">EN</span>'
                : '<span class="text-amber-300 font-black">TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-slate-400 font-medium">EN</span>';
        }
    }

    function init() {
        let currentLang = getLang();
        applyLang(currentLang);

        const langBtn = document.getElementById('privacy-lang-toggle');
        if (langBtn) {
            langBtn.addEventListener('click', function () {
                currentLang = currentLang === 'en' ? 'tr' : 'en';
                try {
                    localStorage.setItem('bar_cepte_lang', currentLang);
                    localStorage.setItem('bar_language', currentLang);
                } catch (e) {}
                applyLang(currentLang);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
