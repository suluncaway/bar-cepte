/* Bar Cepte Reserve — Lisans, Abonelik & Üyelik Yönetim Motoru */
(function (root) {
    'use strict';

    const STORAGE_KEY = 'barcepte_reserve_active';
    const KEY_STORAGE = 'barcepte_reserve_license';
    const PLAN_STORAGE = 'barcepte_reserve_plan';
    const EXPIRES_STORAGE = 'barcepte_reserve_expires_at';

    // Sabit kurucu/yönetici anahtarları
    const MASTER_KEYS = new Set([
        'RESERVE-SULUNCA-2026',
        'BARCEPTE-RESERVE-VIP',
        'RESERVE-MASTER-KEY-2026'
    ]);

    const PLANS_CONFIG = {
        monthly: {
            title: 'Aylık Abonelik (Monthly Pass)',
            price: '39 ₺',
            period: '/ ay',
            badge: 'AYLIK PLAN',
            subtitle: '30 Gün Kesintisiz',
            desc: 'Esnek aylık yenilenen barmenlik keyfi. İstediğin zaman uzat.',
            checkoutLabel: 'Shopier ile Aylık Abone Ol',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Yıllık Abonelik (Annual Pass)',
            price: '299 ₺',
            period: '/ yıl (24,90 ₺/ay)',
            badge: '⭐ %36 TASARRUF — POPÜLER',
            subtitle: '365 Gün VIP Erişim',
            desc: 'Aylık sadece 24,90 ₺! 1 tam yıl boyunca kesintisiz reklamsız deneyim ve altın rozet.',
            checkoutLabel: 'Shopier ile Yıllık Abone Ol',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        },
        lifetime: {
            title: 'Ömür Boyu VIP (Lifetime Pass)',
            price: '499 ₺',
            period: 'tek seferlik',
            badge: 'ÖMÜR BOYU VIP',
            subtitle: 'Sonsuza Kadar Senin',
            desc: 'Bir kere öde, sonsuza kadar reklamsız kullan. Bir daha asla ödeme yapma.',
            checkoutLabel: 'Shopier ile Ömür Boyu Satın Al',
            shopierUrl: 'https://www.shopier.com/Anawin'
        }
    };

    let currentSelectedPlan = 'annual';

    function checksum(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & 0xFFFF;
        }
        return hash.toString(16).toUpperCase().padStart(4, '0');
    }

    function validateLicenseKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') return false;
        const key = rawKey.trim().toUpperCase();
        if (MASTER_KEYS.has(key)) return true;
        const parts = key.split('-');
        if (parts.length !== 4 || parts[0] !== 'RESERVE') return false;
        if (parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4) return false;
        return checksum(parts[1] + parts[2]) === parts[3];
    }

    function getPlanFromKey(rawKey) {
        if (!rawKey) return 'lifetime';
        const key = rawKey.trim().toUpperCase();
        if (MASTER_KEYS.has(key)) return 'lifetime';
        const parts = key.split('-');
        if (parts.length === 4) {
            const prefix = parts[1];
            if (prefix.startsWith('M')) return 'monthly';
            if (prefix.startsWith('A') || prefix.startsWith('Y')) return 'annual';
        }
        return 'lifetime';
    }

    function getDurationForPlan(plan) {
        if (plan === 'monthly') return 30 * 24 * 60 * 60 * 1000; // 30 Gün
        if (plan === 'annual') return 365 * 24 * 60 * 60 * 1000; // 365 Gün
        return 0; // Lifetime
    }

    function getPlanDisplayName(plan) {
        switch (plan) {
            case 'monthly': return 'Aylık Abonelik (Monthly Pass)';
            case 'annual': return 'Yıllık Abonelik (Annual Pass)';
            case 'lifetime': return 'Ömür Boyu VIP (Lifetime Pass)';
            default: return 'Reserve Üyeliği';
        }
    }

    function getSubscriptionInfo() {
        try {
            const activeStored = root.localStorage.getItem(STORAGE_KEY) === 'true';
            const key = root.localStorage.getItem(KEY_STORAGE) || '';
            const plan = root.localStorage.getItem(PLAN_STORAGE) || 'lifetime';
            const expiresAt = Number(root.localStorage.getItem(EXPIRES_STORAGE)) || 0;

            if (activeStored && expiresAt > 0 && Date.now() > expiresAt) {
                // Abonelik süresi doldu
                root.localStorage.removeItem(STORAGE_KEY);
                return { active: false, expired: true, plan, key, expiresAt, daysLeft: 0 };
            }

            let daysLeft = null;
            if (activeStored && expiresAt > 0) {
                daysLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
            }

            return {
                active: activeStored,
                expired: false,
                plan: activeStored ? plan : null,
                key: activeStored ? key : null,
                expiresAt: activeStored ? expiresAt : 0,
                daysLeft: activeStored ? daysLeft : null
            };
        } catch {
            return { active: false, expired: false, plan: null, key: null, expiresAt: 0, daysLeft: null };
        }
    }

    function isReserveActive() {
        return getSubscriptionInfo().active;
    }

    function getLocalDeviceId() {
        try {
            let id = root.localStorage.getItem('barcepte_device_id');
            if (!id) {
                id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
                root.localStorage.setItem('barcepte_device_id', id);
            }
            return id;
        } catch {
            return 'dev_unknown';
        }
    }

    function activateReserve(key) {
        if (!validateLicenseKey(key)) return false;
        try {
            const cleanKey = key.trim().toUpperCase();

            // Tek kullanımlık lisans koruması (BarAuth kontrolü)
            let existingExpiresAt = 0;
            if (root.BarAuth && typeof root.BarAuth.canUseLicenseKey === 'function') {
                const check = root.BarAuth.canUseLicenseKey(cleanKey);
                if (!check.allowed) {
                    const msgEl = typeof document !== 'undefined' ? document.getElementById('reserve-key-msg') : null;
                    if (msgEl) {
                        msgEl.textContent = check.reason;
                        msgEl.className = 'text-xs text-rose-400 font-semibold';
                    }
                    return false;
                }
                if (check.alreadyClaimed) {
                    const registry = root.BarAuth.getClaimedLicenses ? root.BarAuth.getClaimedLicenses() : {};
                    if (registry[cleanKey] && registry[cleanKey].expiresAt) {
                        existingExpiresAt = registry[cleanKey].expiresAt;
                    }
                }
            }

            const plan = getPlanFromKey(cleanKey);
            const duration = getDurationForPlan(plan);
            // Daha önce bu hesaba mühürlenmişse orijinal süresini koru, sıfırdan süre ekleme!
            const expiresAt = existingExpiresAt > 0 ? existingExpiresAt : (duration > 0 ? (Date.now() + duration) : 0);

            root.localStorage.setItem(STORAGE_KEY, 'true');
            root.localStorage.setItem(KEY_STORAGE, cleanKey);
            root.localStorage.setItem(PLAN_STORAGE, plan);
            root.localStorage.setItem(EXPIRES_STORAGE, String(expiresAt));

            // Lisansı kullanıcı hesabına bağla ve tek kullanımlık olarak kaydet
            if (root.BarAuth && typeof root.BarAuth.claimLicenseKey === 'function') {
                root.BarAuth.claimLicenseKey(cleanKey, plan, expiresAt);
            }

            applyReserveUI();
            return true;
        } catch {
            return false;
        }
    }

    async function verifyAndActivateLicense(key) {
        if (!key || typeof key !== 'string') {
            return { success: false, reason: 'Lütfen bir aktivasyon kodu giriniz.' };
        }
        const cleanKey = key.trim().toUpperCase();

        // 1. Format ve sağlama toplamı kontrolü
        if (!validateLicenseKey(cleanKey)) {
            return { success: false, reason: '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.' };
        }

        // 2. Master Key kontrolü (Geliştirici anahtarları)
        if (MASTER_KEYS.has(cleanKey)) {
            activateReserve(cleanKey);
            return { success: true, plan: 'lifetime', isMaster: true };
        }

        // 3. Yerel BarAuth kontrolü
        if (root.BarAuth && typeof root.BarAuth.canUseLicenseKey === 'function') {
            const localCheck = root.BarAuth.canUseLicenseKey(cleanKey);
            if (!localCheck.allowed) {
                return { success: false, reason: localCheck.reason };
            }
        }

        // 4. Merkezi Sunucu (Render Webhook) Doğrulaması
        const user = root.BarAuth && typeof root.BarAuth.getCurrentUser === 'function' ? root.BarAuth.getCurrentUser() : null;
        const deviceId = (root.BarAuth && typeof root.BarAuth.getDeviceId === 'function') ? root.BarAuth.getDeviceId() : getLocalDeviceId();
        const payload = {
            key: cleanKey,
            uid: user ? user.uid : null,
            email: user ? user.email : '',
            deviceId: deviceId
        };

        try {
            const resp = await fetch('https://bar-cepte-webhook.onrender.com/api/claim-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                // Sunucu reddetti (başkası tarafından kullanılmış veya süresi dolmuş)
                if (root.BarAuth && typeof root.BarAuth.markLicenseClaimedLocally === 'function') {
                    root.BarAuth.markLicenseClaimedLocally(cleanKey, data.claimedBy || 'external_user');
                }
                return {
                    success: false,
                    reason: data.reason || '❌ Bu lisans anahtarı daha önce başka bir kullanıcı/cihaz tarafından kullanılmış! Lisanslar tek kullanımlıktır.'
                };
            }

            // Sunucu onayladı! Lisansı bu cihaza kaydet
            const plan = data.plan || getPlanFromKey(cleanKey);
            const expiresAt = Number(data.expiresAt) || 0;

            root.localStorage.setItem(STORAGE_KEY, 'true');
            root.localStorage.setItem(KEY_STORAGE, cleanKey);
            root.localStorage.setItem(PLAN_STORAGE, plan);
            root.localStorage.setItem(EXPIRES_STORAGE, String(expiresAt));

            if (root.BarAuth && typeof root.BarAuth.claimLicenseKey === 'function') {
                root.BarAuth.claimLicenseKey(cleanKey, plan, expiresAt);
            }

            applyReserveUI();
            return { success: true, plan, expiresAt, message: data.message };
        } catch (err) {
            console.warn('Merkezi lisans sunucusuna ulaşılamadı, yerel doğrulama uygulanıyor:', err);
            const localSuccess = activateReserve(cleanKey);
            if (localSuccess) {
                return { success: true, plan: getPlanFromKey(cleanKey), offline: true };
            }
            return { success: false, reason: 'Aktivasyon gerçekleştirilemedi.' };
        }
    }

    function activateFromCloud(reserveData) {
        if (!reserveData || !reserveData.active) return false;
        try {
            const expiresAt = Number(reserveData.expiresAt) || 0;
            if (expiresAt > 0 && Date.now() > expiresAt) return false;

            root.localStorage.setItem(STORAGE_KEY, 'true');
            if (reserveData.key) root.localStorage.setItem(KEY_STORAGE, reserveData.key);
            if (reserveData.plan) root.localStorage.setItem(PLAN_STORAGE, reserveData.plan);
            root.localStorage.setItem(EXPIRES_STORAGE, String(expiresAt));
            applyReserveUI();
            return true;
        } catch {
            return false;
        }
    }

    function deactivateReserve() {
        try {
            root.localStorage.removeItem(STORAGE_KEY);
            root.localStorage.removeItem(KEY_STORAGE);
            root.localStorage.removeItem(PLAN_STORAGE);
            root.localStorage.removeItem(EXPIRES_STORAGE);
            root.location.reload();
        } catch {}
    }

    function selectPlan(planKey) {
        currentSelectedPlan = planKey;
        const config = PLANS_CONFIG[planKey] || PLANS_CONFIG.annual;

        document.querySelectorAll('.reserve-plan-tab').forEach(tab => {
            const isTarget = tab.dataset.plan === planKey;
            tab.className = isTarget
                ? 'reserve-plan-tab flex-1 py-1.5 px-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm transition-all font-black cursor-pointer'
                : 'reserve-plan-tab flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer';
        });

        const titleEl = document.getElementById('reserve-plan-title');
        const badgeEl = document.getElementById('reserve-plan-badge');
        const priceEl = document.getElementById('reserve-plan-price');
        const periodEl = document.getElementById('reserve-plan-period');
        const subtitleEl = document.getElementById('reserve-plan-subtitle');
        const descEl = document.getElementById('reserve-plan-desc');
        const checkoutBtn = document.getElementById('btn-shopier-checkout');
        const checkoutLabel = document.getElementById('reserve-checkout-label');

        if (titleEl) titleEl.textContent = config.title;
        if (badgeEl) badgeEl.textContent = config.badge;
        if (priceEl) priceEl.textContent = config.price;
        if (periodEl) periodEl.textContent = config.period;
        if (subtitleEl) subtitleEl.textContent = config.subtitle;
        if (descEl) descEl.textContent = config.desc;
        if (checkoutBtn) checkoutBtn.href = config.shopierUrl;
        if (checkoutLabel) checkoutLabel.textContent = config.checkoutLabel;
    }

    function applyReserveUI() {
        const active = isReserveActive();
        
        // Reklam alanlarını ve sponsor kartlarını gizle / göster
        const adSlots = document.querySelectorAll('.ad-slot-container');
        adSlots.forEach(slot => {
            slot.style.display = active ? 'none' : '';
        });
        const affiliateBanner = document.getElementById('affiliate-banner');
        if (affiliateBanner) {
            affiliateBanner.style.display = active ? 'none' : '';
        }

        // Üst başlıktaki logo yanına RESERVE rozeti ekle
        const brandHeading = document.querySelector('.topbar h1');
        if (brandHeading) {
            let badge = document.getElementById('reserve-brand-badge');
            if (active) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.id = 'reserve-brand-badge';
                    badge.className = 'px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-sm ml-1 select-none animate-pulse';
                    badge.textContent = 'RESERVE';
                    brandHeading.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        }

        // Reserve butonu metnini ve stilini güncelle
        const reserveBtnLabel = document.getElementById('reserve-btn-label');
        const reserveBtn = document.getElementById('btn-open-reserve');
        if (reserveBtnLabel && reserveBtn) {
            if (active) {
                reserveBtnLabel.textContent = 'Reserve Aktif';
                reserveBtn.classList.add('border-amber-400', 'bg-amber-500/20');
            } else {
                reserveBtnLabel.textContent = 'Reserve';
                reserveBtn.classList.remove('border-amber-400', 'bg-amber-500/20');
            }
        }

        // Modal içeriğini güncelle
        const statusInactive = document.getElementById('reserve-status-inactive');
        const statusActive = document.getElementById('reserve-status-active');
        if (statusInactive && statusActive) {
            if (active) {
                statusInactive.classList.add('hidden');
                statusActive.classList.remove('hidden');

                const subInfo = getSubscriptionInfo();
                const badgeEl = document.getElementById('reserve-active-plan-badge');
                const durationEl = document.getElementById('reserve-active-duration');
                
                if (badgeEl) {
                    badgeEl.textContent = getPlanDisplayName(subInfo.plan);
                }
                if (durationEl) {
                    if (subInfo.plan === 'lifetime') {
                        durationEl.textContent = '♾️ Ömür Boyu (Sınırsız)';
                    } else if (subInfo.daysLeft !== null) {
                        durationEl.textContent = `⏳ ${subInfo.daysLeft} Gün Kaldı`;
                    }
                }
            } else {
                statusInactive.classList.remove('hidden');
                statusActive.classList.add('hidden');
            }
        }
    }

    function init() {
        applyReserveUI();

        // Buton ve Modal Bağlantıları
        const openBtn = document.getElementById('btn-open-reserve');
        const modal = document.getElementById('reserve-modal');
        const closeBtn = document.getElementById('btn-close-reserve');
        const activateBtn = document.getElementById('btn-activate-reserve');
        const keyInput = document.getElementById('reserve-key-input');
        const msgEl = document.getElementById('reserve-key-msg');
        const deactivateBtn = document.getElementById('btn-deactivate-reserve');

        // Plan sekmeleri tıklamaları
        document.querySelectorAll('.reserve-plan-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.plan) {
                    selectPlan(tab.dataset.plan);
                }
            });
        });

        if (keyInput) {
            keyInput.addEventListener('input', () => {
                keyInput.value = keyInput.value.toUpperCase();
            });
            keyInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activateBtn) activateBtn.click();
                }
            });
        }

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                applyReserveUI();
                selectPlan(currentSelectedPlan);
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                if (msgEl) msgEl.textContent = '';
                if (keyInput) keyInput.value = '';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeBtn.click();
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                    closeBtn.click();
                }
            });
        }

        if (activateBtn && keyInput) {
            activateBtn.addEventListener('click', async () => {
                const code = keyInput.value;
                if (!code.trim()) {
                    if (msgEl) {
                        msgEl.textContent = 'Lütfen aktivasyon kodunuzu giriniz.';
                        msgEl.className = 'text-xs text-rose-400 font-semibold';
                    }
                    return;
                }

                const origText = activateBtn.textContent;
                activateBtn.disabled = true;
                activateBtn.textContent = 'Kontrol ediliyor...';
                if (msgEl) {
                    msgEl.textContent = 'Lisans doğrulanıyor...';
                    msgEl.className = 'text-xs text-amber-400 font-medium animate-pulse';
                }

                try {
                    const result = await verifyAndActivateLicense(code);
                    if (result.success) {
                        const subInfo = getSubscriptionInfo();
                        const planName = getPlanDisplayName(subInfo.plan);
                        if (msgEl) {
                            msgEl.textContent = `🎉 Tebrikler! ${planName} başarıyla aktif edildi.`;
                            msgEl.className = 'text-xs text-emerald-400 font-bold';
                        }
                        setTimeout(() => {
                            applyReserveUI();
                        }, 500);
                    } else {
                        if (msgEl) {
                            msgEl.textContent = result.reason || '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.';
                            msgEl.className = 'text-xs text-rose-400 font-semibold';
                        }
                    }
                } finally {
                    activateBtn.disabled = false;
                    activateBtn.textContent = origText;
                }
            });
        }

        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', () => {
                if (confirm('Reserve üyeliğinizi bu cihazdan kaldırmak istediğinize emin misiniz?')) {
                    deactivateReserve();
                }
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    const api = {
        isReserveActive,
        activateReserve,
        verifyAndActivateLicense,
        activateFromCloud,
        deactivateReserve,
        validateLicenseKey,
        checksum,
        getSubscriptionInfo,
        getPlanFromKey,
        getPlanDisplayName,
        PLANS_CONFIG
    };
    root.BarReserve = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
