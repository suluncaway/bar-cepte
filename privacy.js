// Privacy Policy & 18+ Notice Internationalization (TR/EN)
(function () {
    const I18N_PRIVACY = {
        tr: {
            title: "Gizlilik Politikası & 18+ Yasal Uyarı — Bar Cepte",
            back: "← Bar Cepte'ye Dön",
            h1: "<span>🛡️</span> Gizlilik Politikası & 18+ Yasal Uyarı",
            updated: "Son güncelleme: Ekim 2026",
            sec1Title: "Yetişkinlere Yönelik İçerik & Reklam Politikası",
            sec1P1: "Bar Cepte (<strong>barcepte.com.tr</strong>) platformunda sunulan kokteyl tarifleri, miksoloji kılavuzları, içerikler ve yayınlanan tüm reklamlar <strong>yalnızca 18 yaş ve üzeri yetişkin kullanıcılar</strong> içindir.",
            sec1P2: "Sitemiz hiçbir şekilde alkollü içki satışı yapmamaktadır ve reşit olmayan bireylerin alkol tüketimini kesinlikle teşvik etmemektedir. Türkiye Cumhuriyeti kanunları ve uluslararası yasal düzenlemeler uyarınca 18 yaşın altındaki kişilerin alkol tüketmesi, temin etmesi yasaktır. Sağlığınız için lütfen ölçülü ve sorumlu tüketiniz.",
            sec2Title: "<span>🍪</span> Google AdSense ve Çerez (Cookie) Kullanımı",
            sec2P: "Bar Cepte, hizmetlerini ücretsiz olarak sürdürebilmek amacıyla Google AdSense gibi üçüncü taraf reklam ağlarını kullanmaktadır. Google dahil olmak üzere üçüncü taraf sağlayıcılar, sitemizde veya diğer web sitelerinde yapılan önceki ziyaretlere dayalı olarak reklam yayınlamak için çerezleri (cookies) kullanır.",
            sec2L1: "Google'ın reklam çerezlerini kullanması, Google ve iş ortaklarının kullanıcılarımıza Bar Cepte ve/veya internetteki diğer sitelere yaptıkları ziyaretlere dayalı olarak reklam sunmasını sağlar.",
            sec2L2: "Kullanıcılar, <a href=\"https://adssettings.google.com\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-amber-400 hover:underline\">Google Reklam Ayarları</a> sayfasını ziyaret ederek kişiselleştirilmiş reklamcılığı devre dışı bırakabilirler.",
            sec2L3: "Tarayıcı ayarlarınız üzerinden çerez kullanımını istediğiniz zaman engelleyebilir veya temizleyebilirsiniz.",
            sec3Title: "<span>🔒</span> Veri Gizliliği ve Yerel Depolama (LocalStorage)",
            sec3P: "Bar Cepte, kullanıcı gizliliğini en üst seviyede tutacak şekilde tasarlanmıştır. Favori kokteylleriniz, mutfak envanteriniz ve oluşturduğunuz özel tarifler uzak bir sunucuya kaydedilmez; yalnızca kendi cihazınızdaki tarayıcı hafızasında (LocalStorage) şifreli/güvenli olarak saklanır.",
            sec4Title: "<span>✉️</span> İletişim & Hak Talepleri",
            sec4P: "Gizlilik politikamız, içeriklerimiz veya telif hakları ile ilgili her türlü soru ve geri bildiriminiz için GitHub profilimiz üzerinden veya proje sayfamızdan bizimle iletişime geçebilirsiniz:",
            footer: "&copy; 2026 Bar Cepte — Tüm hakları saklıdır."
        },
        en: {
            title: "Privacy Policy & 18+ Legal Notice — Pocket Bar",
            back: "← Back to Pocket Bar",
            h1: "<span>🛡️</span> Privacy Policy & 18+ Legal Notice",
            updated: "Last updated: October 2026",
            sec1Title: "Adult Content & Advertising Policy",
            sec1P1: "Cocktail recipes, mixology guides, editorial content, and all advertisements displayed on Pocket Bar (<strong>barcepte.com.tr</strong>) are intended exclusively for <strong>adult users aged 18 and older</strong>.",
            sec1P2: "Our platform does not sell alcoholic beverages under any circumstances and strictly discourages underage drinking. Under applicable laws, purchasing or consuming alcohol under the legal drinking age (18+) is prohibited. Please drink responsibly and in moderation.",
            sec2Title: "<span>🍪</span> Google AdSense & Cookie Usage",
            sec2P: "Pocket Bar uses third-party advertising networks like Google AdSense to sustain its free service. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other sites.",
            sec2L1: "Google's use of advertising cookies enables it and its partners to serve relevant ads based on users' visits to Pocket Bar and/or other sites on the Internet.",
            sec2L2: "Users may opt out of personalized advertising by visiting the <a href=\"https://adssettings.google.com\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-amber-400 hover:underline\">Google Ad Settings</a> page.",
            sec2L3: "You can block or delete cookies anytime through your web browser preferences.",
            sec3Title: "<span>🔒</span> Data Privacy & Local Storage",
            sec3P: "Pocket Bar is engineered with complete privacy in mind. Your bar cabinet ingredients, favorites, and custom recipes are never sent to an external analytics server; they are stored locally and encrypted in your device's browser memory (LocalStorage).",
            sec4Title: "<span>✉️</span> Contact & Legal Inquiries",
            sec4P: "For any questions, suggestions, or copyright inquiries regarding our privacy policy or content, please feel free to reach out via our GitHub repository:",
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

        const backLink = document.getElementById('privacy-back-link');
        if (backLink) backLink.textContent = t.back;

        const h1 = document.getElementById('privacy-h1');
        if (h1) h1.innerHTML = t.h1;

        const updated = document.getElementById('privacy-updated');
        if (updated) updated.textContent = t.updated;

        const sec1Title = document.getElementById('privacy-sec1-title');
        if (sec1Title) sec1Title.textContent = t.sec1Title;

        const sec1P1 = document.getElementById('privacy-sec1-p1');
        if (sec1P1) sec1P1.innerHTML = t.sec1P1;

        const sec1P2 = document.getElementById('privacy-sec1-p2');
        if (sec1P2) sec1P2.innerHTML = t.sec1P2;

        const sec2Title = document.getElementById('privacy-sec2-title');
        if (sec2Title) sec2Title.innerHTML = t.sec2Title;

        const sec2P = document.getElementById('privacy-sec2-p');
        if (sec2P) sec2P.textContent = t.sec2P;

        const sec2L1 = document.getElementById('privacy-sec2-l1');
        if (sec2L1) sec2L1.textContent = t.sec2L1;

        const sec2L2 = document.getElementById('privacy-sec2-l2');
        if (sec2L2) sec2L2.innerHTML = t.sec2L2;

        const sec2L3 = document.getElementById('privacy-sec2-l3');
        if (sec2L3) sec2L3.textContent = t.sec2L3;

        const sec3Title = document.getElementById('privacy-sec3-title');
        if (sec3Title) sec3Title.innerHTML = t.sec3Title;

        const sec3P = document.getElementById('privacy-sec3-p');
        if (sec3P) sec3P.textContent = t.sec3P;

        const sec4Title = document.getElementById('privacy-sec4-title');
        if (sec4Title) sec4Title.innerHTML = t.sec4Title;

        const sec4P = document.getElementById('privacy-sec4-p');
        if (sec4P) sec4P.textContent = t.sec4P;

        const footer = document.getElementById('privacy-footer');
        if (footer) footer.innerHTML = t.footer;

        const langBtn = document.getElementById('privacy-lang-toggle');
        if (langBtn) {
            langBtn.innerHTML = lang === 'en'
                ? '<span class="text-slate-400 font-medium">TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-amber-300 font-black">EN 🇺🇸</span>'
                : '<span class="text-amber-300 font-black">🇹🇷 TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-slate-400 font-medium">EN</span>';
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
