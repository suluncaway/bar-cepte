/* Bar Cepte - AdSense & Reklam Yönetim Modülü */
(function (root) {
    'use strict';

    // Electron masaüstü ortamında reklamları çalıştırma
    const isElectron = typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Electron');

    function initAds() {
        const adContainers = document.querySelectorAll('.ad-slot-container');
        if (isElectron) {
            // Electron uygulamasında reklam alanlarını gizle
            adContainers.forEach(container => {
                container.style.display = 'none';
            });
            return;
        }

        // Web ortamında AdSense slotlarını tetikle
        try {
            const adUnits = document.querySelectorAll('.adsbygoogle');
            adUnits.forEach(unit => {
                // Eğer slot daha önce yüklenmediyse push et
                if (!unit.getAttribute('data-adsbygoogle-status')) {
                    (root.adsbygoogle = root.adsbygoogle || []).push({});
                }
            });
        } catch (e) {
            console.warn('[BarCepte Ads] Reklam servisi çağrılamadı (muhtemel AdBlocker):', e);
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAds);
        } else {
            initAds();
        }
    }

    root.BarAds = { initAds, isElectron };
    if (typeof module !== 'undefined') module.exports = root.BarAds;
})(typeof window !== 'undefined' ? window : globalThis);
