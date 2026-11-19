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
            price: '40 ₺',
            period: '/ ay',
            badge: 'AYLIK PLAN',
            subtitle: '30 Gün Kesintisiz',
            desc: 'Esnek aylık yenilenen barmenlik keyfi. İstediğin zaman uzat.',
            checkoutLabel: 'Shopier ile Aylık Abone Ol',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Yıllık Abonelik',
            price: '400 ₺',
            period: '/ yıl (33,33 ₺/ay)',
            badge: '%17 tasarruf',
            subtitle: '365 gün erişim',
            desc: 'Ayda 33,33 ₺. Bir yıl boyunca reklamsız kullanım ve Reserve rozeti.',
            checkoutLabel: 'Shopier ile Yıllık Abone Ol',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        }
    };

    const PLANS_CONFIG_EN = {
        monthly: {
            title: 'Monthly Pass (30 Days)',
            price: '$2.99',
            period: '/ month',
            badge: 'MONTHLY PASS',
            subtitle: '30 Days Full Access',
            desc: 'Flexible monthly home bartending enjoyment. Cancel anytime.',
            checkoutLabel: 'Secure Checkout via Shopier ($2.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Annual Pass',
            price: '$14.99',
            period: '/ year ($1.25/mo)',
            badge: 'Save 58%',
            subtitle: '365 days of access',
            desc: '$1.25 a month. One year ad-free, with the Reserve badge.',
            checkoutLabel: 'Secure Checkout via Shopier ($14.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        }
    };

    const PLANS_CONFIG_EUR = {
        monthly: {
            title: 'Monthly Pass (30 Days)',
            price: '€2.99',
            period: '/ month',
            badge: 'MONTHLY PASS',
            subtitle: '30 Days Full Access',
            desc: 'Flexible monthly home bartending enjoyment. Cancel anytime.',
            checkoutLabel: 'Secure Checkout via Shopier (€2.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Annual Pass',
            price: '€13.99',
            period: '/ year (€1.16/mo)',
            badge: 'Save 60%',
            subtitle: '365 days of access',
            desc: '€1.16 a month. One year ad-free, with the Reserve badge.',
            checkoutLabel: 'Secure Checkout via Shopier (€13.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        }
    };

    let currentSelectedPlan = 'annual';
    let currentCurrency = 'usd'; // 'usd' | 'eur'
    try {
        const storedCur = root.localStorage ? root.localStorage.getItem('barcepte_reserve_currency') : null;
        if (storedCur === 'eur' || storedCur === 'usd') currentCurrency = storedCur;
    } catch(e) {}

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

    function getCurrentLang() {
        if (typeof root !== 'undefined' && root.currentLang) return root.currentLang;
        try {
            if (typeof root !== 'undefined' && root.localStorage) {
                const s = root.localStorage.getItem('bar_cepte_lang') || root.localStorage.getItem('bar_language');
                if (s === 'en') return 'en';
            }
        } catch(e) {}
        return 'tr';
    }

    function getPlanDisplayName(plan) {
        if (getCurrentLang() === 'en') {
            switch (plan) {
                case 'monthly': return 'Monthly Pass (30 Days)';
                case 'annual': return 'Annual Pass (365 Days)';
                case 'lifetime': return 'Lifetime VIP Pass';
                default: return 'Reserve Membership';
            }
        }
        switch (plan) {
            case 'monthly': return 'Aylık Abonelik (Monthly Pass)';
            case 'annual': return 'Yıllık Abonelik (Annual Pass)';
            case 'lifetime': return 'Ömür Boyu VIP (Lifetime Pass)';
            default: return 'Reserve Üyeliği';
        }
    }

    // Entitlement lives in memory and comes only from a successful server verification in this
    // session. localStorage keeps the key so it can be re-verified on the next start; it is never proof.
    let verifiedSubscription = null;
    let entitlementGeneration = 0;
    let expiryTimer = null;
    const EMPTY_SUBSCRIPTION = { active: false, expired: false, plan: null, key: null, expiresAt: 0, daysLeft: null };

    function monotonicNow() {
        return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now();
    }

    function ownerScope() {
        const user = root.BarAuth && typeof root.BarAuth.getCurrentUser === 'function' ? root.BarAuth.getCurrentUser() : null;
        return user ? user.uid : null;
    }

    function getSubscriptionInfo() {
        const sub = verifiedSubscription;
        if (!sub || sub.owner !== ownerScope()) return { ...EMPTY_SUBSCRIPTION };
        const now = Date.now();
        // A clock moved backwards cannot extend a subscription: wall time and monotonic time must both agree.
        const expired = sub.expiresAt > 0 && (now >= sub.expiresAt || now < sub.observedAt ||
            monotonicNow() - sub.monotonicStart >= sub.remainingMs);
        if (expired) return { ...EMPTY_SUBSCRIPTION, expired: true, plan: sub.plan, key: sub.key, expiresAt: sub.expiresAt, daysLeft: 0 };
        return {
            active: true, expired: false, plan: sub.plan, key: sub.key, expiresAt: sub.expiresAt,
            daysLeft: sub.expiresAt > 0 ? Math.max(0, Math.ceil((sub.expiresAt - now) / 86400000)) : null
        };
    }

    function isReserveActive() {
        return getSubscriptionInfo().active;
    }

    function getLocalDeviceId() {
        try {
            let id = root.localStorage.getItem('barcepte_device_id');
            if (!id) {
                const bytes = new Uint8Array(32);
                root.crypto.getRandomValues(bytes);
                id = 'dev_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
                root.localStorage.setItem('barcepte_device_id', id);
            }
            return id;
        } catch {
            return null;
        }
    }

    // New ids are "dev_" + 64 hex and the API receives the hex part. Ids created before that format
    // are sent unchanged, so licences already bound to them keep matching on the server.
    function deviceIdForServer(id) {
        if (typeof id !== 'string') return null;
        const match = /^dev_([a-f0-9]{64})$/.exec(id);
        return match ? match[1] : id;
    }

    // Legacy synchronous entry points: they cannot reach the server, so they never grant Reserve.
    function activateReserve() { return false; }
    function activateFromCloud() { return false; }

    async function verifyAndActivateLicense(key, options = {}) {
        const isEn = getCurrentLang() === 'en';
        const fail = reason => ({ success: false, reason });
        if (!key || typeof key !== 'string') {
            return fail(isEn ? 'Please enter an activation key.' : 'Lütfen bir aktivasyon kodu giriniz.');
        }
        const cleanKey = key.trim().toUpperCase();
        if (!validateLicenseKey(cleanKey)) {
            return fail(isEn ? 'Invalid activation key. Please check again.' : 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.');
        }

        const auth = root.BarAuth;
        const user = auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (user && user.provider === 'google') {
            // The server binds Google licences to the account; without a live session it cannot confirm ownership.
            const token = typeof auth.getIdToken === 'function' ? auth.getIdToken() : null;
            if (!token) return fail(isEn ? 'Sign in with Google again to confirm your membership.' : 'Üyeliğini doğrulamak için Google ile tekrar giriş yap.');
            headers.Authorization = 'Bearer ' + token;
        }
        const deviceId = deviceIdForServer(auth && typeof auth.getDeviceId === 'function' ? auth.getDeviceId() : getLocalDeviceId());
        const generation = entitlementGeneration;
        const owner = ownerScope();

        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = controller && root.setTimeout ? root.setTimeout(() => controller.abort(), 65000) : null;
        try {
            const resp = await root.fetch('https://bar-cepte-webhook.onrender.com/api/claim-license', {
                method: 'POST', headers,
                body: JSON.stringify({ key: cleanKey, deviceId }),
                signal: controller ? controller.signal : undefined
            });
            // Render can answer a cold start with an HTML error page; never let that surface as a network error.
            let data = {};
            try { data = await resp.json(); } catch { data = {}; }
            // A logout or account switch while waiting makes the answer belong to someone else.
            if (generation !== entitlementGeneration || owner !== ownerScope()) {
                return fail(isEn ? 'Your account changed during verification. Please try again.' : 'Doğrulama sırasında hesap değişti. Lütfen tekrar dene.');
            }
            if (!resp.ok || data.success !== true) {
                if (resp.status === 409) {
                    return fail(isEn
                        ? 'This license key was already claimed by another user or device. Licenses are single-use.'
                        : 'Bu lisans anahtarı başka bir kullanıcı ya da cihazda kullanılmış. Lisanslar tek kullanımlıktır.');
                }
                // Anything but a 409 is a server problem or an expired key: say what the server said, else ask to retry.
                return fail((typeof data.reason === 'string' && data.reason) || (isEn
                    ? 'The license server could not confirm your key right now. Your key is safe; please try again in a minute.'
                    : 'Lisans sunucusu şu an kodunu doğrulayamadı. Kodun geçerli kalır; bir dakika sonra tekrar dene.'));
            }

            const { plan, expiresAt } = data;
            if (!['monthly', 'annual', 'lifetime'].includes(plan) ||
                typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) ||
                (plan === 'lifetime' ? expiresAt !== 0 : expiresAt <= Date.now())) {
                throw new Error('Invalid subscription response');
            }

            // Remember the key for re-verification first; if storage fails, nothing is granted.
            root.localStorage.setItem(KEY_STORAGE, cleanKey);
            root.localStorage.setItem(PLAN_STORAGE, plan);
            root.localStorage.setItem(EXPIRES_STORAGE, String(expiresAt));
            const now = Date.now();
            verifiedSubscription = { key: cleanKey, plan, expiresAt, owner, observedAt: now,
                monotonicStart: monotonicNow(), remainingMs: expiresAt > 0 ? expiresAt - now : Infinity };
            scheduleExpiryCheck();
            applyReserveUI();
            return { success: true, plan, expiresAt, message: data.message };
        } catch (err) {
            if (!options.silent && root.console) root.console.warn('Merkezi lisans doğrulaması tamamlanamadı:', err);
            return fail(isEn
                ? 'License verification is unavailable. Please connect to the internet and try again.'
                : 'Lisans doğrulaması yapılamadı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.');
        } finally {
            if (timeout !== null) root.clearTimeout(timeout);
        }
    }

    // On start, a key saved by an earlier successful verification is checked with the server again.
    function reverifyStoredLicense() {
        let stored = null;
        try { stored = root.localStorage.getItem(KEY_STORAGE); } catch {}
        if (!stored || isReserveActive()) return Promise.resolve({ success: isReserveActive() });
        return verifyAndActivateLicense(stored, { silent: true });
    }

    function scheduleExpiryCheck() {
        if (expiryTimer) root.clearTimeout(expiryTimer);
        expiryTimer = null;
        if (!verifiedSubscription || !(verifiedSubscription.expiresAt > 0) || !root.setTimeout) return;
        expiryTimer = root.setTimeout(() => {
            applyReserveUI();
            if (isReserveActive()) scheduleExpiryCheck();
        }, Math.min(60000, Math.max(1000, verifiedSubscription.expiresAt - Date.now())));
        if (expiryTimer && expiryTimer.unref) expiryTimer.unref();
    }

    // Ends the entitlement for this session and invalidates any verification still in flight.
    // forget=true also drops the saved key (the "remove membership from this device" button).
    function deactivateReserve(forget = false) {
        entitlementGeneration++;
        verifiedSubscription = null;
        if (expiryTimer) root.clearTimeout(expiryTimer);
        expiryTimer = null;
        try {
            root.localStorage.removeItem(STORAGE_KEY);
            if (forget === true) {
                root.localStorage.removeItem(KEY_STORAGE);
                root.localStorage.removeItem(PLAN_STORAGE);
                root.localStorage.removeItem(EXPIRES_STORAGE);
            }
        } catch {}
        applyReserveUI();
    }

    function selectPlan(planKey) {
        currentSelectedPlan = planKey;
        const isEn = getCurrentLang() === 'en';
        let dict = PLANS_CONFIG;
        if (isEn) {
            dict = currentCurrency === 'eur' ? PLANS_CONFIG_EUR : PLANS_CONFIG_EN;
        }
        const config = dict[planKey] || dict.annual;

        document.querySelectorAll('.reserve-plan-tab').forEach(tab => {
            const isTarget = tab.dataset.plan === planKey;
            tab.className = isTarget
                ? 'reserve-plan-tab flex-1 py-1.5 px-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm transition-all font-black cursor-pointer'
                : 'reserve-plan-tab flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer';
        });

        const planMonthly = document.querySelector('[data-plan="monthly"]');
        if (planMonthly) planMonthly.innerText = isEn ? 'Monthly' : 'Aylık';
        const planAnnual = document.querySelector('[data-plan="annual"]');
        if (planAnnual) planAnnual.innerText = isEn ? 'Annual' : 'Yıllık';

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
        if (root.AndroidBridge && typeof root.AndroidBridge.setReserveActive === 'function') {
            try { root.AndroidBridge.setReserveActive(isReserveActive()); } catch {}
        }
        if (typeof document === 'undefined') return;
        const active = isReserveActive();
        const isEn = getCurrentLang() === 'en';
        
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
                reserveBtnLabel.textContent = isEn ? 'Reserve Active' : 'Reserve Aktif';
                reserveBtn.classList.add('border-amber-400', 'bg-amber-500/20');
            } else {
                reserveBtnLabel.textContent = 'Reserve';
                reserveBtn.classList.remove('border-amber-400', 'bg-amber-500/20');
            }
            reserveBtn.title = isEn ? 'Pocket Bar Reserve — Ad-Free & Exclusive Curation' : 'Bar Cepte Reserve — Reklamsız & Özel Seçkiler';
        }

        // Modal başlık & üst rozet
        const reserveClubBadge = document.querySelector('#reserve-modal .inline-flex');
        if (reserveClubBadge) {
            reserveClubBadge.innerHTML = isEn ? '<span><i class="bci bci-crown" aria-hidden="true"></i></span> EXCLUSIVE CURATION CLUB' : '<span><i class="bci bci-crown" aria-hidden="true"></i></span> ÖZEL SEÇKİ KULÜBÜ';
        }
        const reserveHeading = document.querySelector('#reserve-modal h3');
        if (reserveHeading) {
            reserveHeading.innerHTML = isEn
                ? 'POCKET BAR <span class="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">RESERVE</span>'
                : 'BAR CEPTE <span class="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">RESERVE</span>';
        }
        const reserveDesc = document.querySelector('#reserve-modal .space-y-1 p');
        if (reserveDesc) {
            reserveDesc.innerText = isEn
                ? 'Unleash your bar. Ad-free, unlimited, and master mixologist level.'
                : 'Barının sınırlarını kaldır. Reklamsız, sınırsız ve usta miksoloji seviyesinde.';
        }

        // Avantajlar listesi (4 Bullets)
        const reserveBullets = document.querySelectorAll('#reserve-status-inactive .bg-black\\/40 > div span:last-child');
        if (reserveBullets.length >= 4) {
            reserveBullets[0].innerHTML = isEn
                ? '<strong>100% Ad-Free Experience:</strong> Zero ads, pure speed.'
                : '<strong>%100 Reklamsız Deneyim:</strong> Sıfır reklam, kesintisiz hız.';
            reserveBullets[1].innerHTML = isEn
                ? '<strong>Secret Speakeasy Curation:</strong> Master bartenders\' signature cocktails & syrup guides.'
                : '<strong>Gizli Speakeasy Seçkisi:</strong> Usta barmenlerin imza kokteylleri ve şurup rehberleri.';
            reserveBullets[2].innerHTML = isEn
                ? '<strong>Party & Batch Calculator:</strong> Exact ingredient scaling for 10-50 guests.'
                : '<strong>Parti & Porsiyon Modu:</strong> 10-50 kişilik davetler için tam malzeme hesabı.';
            reserveBullets[3].innerHTML = isEn
                ? '<strong>Reserve badge:</strong> Shown on your account, with priority support.'
                : '<strong>Reserve rozeti:</strong> Hesabında görünür, öncelikli destek dahil.';
        }

        // Sekmeler
        const planMonthly = document.querySelector('[data-plan="monthly"]');
        if (planMonthly) planMonthly.innerText = isEn ? 'Monthly' : 'Aylık';
        const planAnnual = document.querySelector('[data-plan="annual"]');
        if (planAnnual) planAnnual.innerText = isEn ? 'Annual' : 'Yıllık';

        // Para birimi seçici çubuğu (Currency Bar - USD $ / EUR €)
        const currencyBar = document.getElementById('reserve-currency-bar');
        if (currencyBar) {
            if (isEn) {
                currencyBar.classList.remove('hidden');
                currencyBar.classList.add('flex');
                document.querySelectorAll('.reserve-currency-btn').forEach(btn => {
                    const isTarget = btn.dataset.currency === currentCurrency;
                    btn.className = isTarget
                        ? 'reserve-currency-btn px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black cursor-pointer'
                        : 'reserve-currency-btn px-2 py-0.5 rounded text-slate-400 hover:text-white cursor-pointer';
                });
            } else {
                currencyBar.classList.add('hidden');
                currencyBar.classList.remove('flex');
            }
        }

        // Aktivasyon kodu başlık & buton
        const reservePrompt = document.querySelector('#reserve-status-inactive .border-t p');
        if (reservePrompt) reservePrompt.innerText = isEn ? 'Already have an activation code?' : 'Zaten bir aktivasyon kodun var mı?';
        const keyInput = document.getElementById('reserve-key-input');
        if (keyInput) keyInput.placeholder = 'RESERVE-XXXX-XXXX-XXXX';
        const activateBtn = document.getElementById('btn-activate-reserve');
        if (activateBtn && !activateBtn.disabled) {
            activateBtn.innerText = isEn ? 'Activate' : 'Aktive Et';
        }

        // Modal içeriğini güncelle
        const statusInactive = document.getElementById('reserve-status-inactive');
        const statusActive = document.getElementById('reserve-status-active');
        if (statusInactive && statusActive) {
            if (active) {
                statusInactive.classList.add('hidden');
                statusActive.classList.remove('hidden');

                const subInfo = getSubscriptionInfo();
                const activeH4 = document.querySelector('#reserve-status-active h4');
                if (activeH4) activeH4.innerText = isEn ? 'Your Reserve Membership is Active!' : 'Reserve Üyeliğiniz Aktif!';
                const badgeEl = document.getElementById('reserve-active-plan-badge');
                const durationEl = document.getElementById('reserve-active-duration');
                const activeDesc = document.querySelector('#reserve-status-active p.text-xs');
                if (activeDesc) {
                    activeDesc.innerText = isEn
                        ? 'All privileges, secret cocktails, and ad-free experience are active on this device.'
                        : 'Tüm ayrıcalıklar, gizli kokteyller ve reklamsız deneyim bu cihazda devrede.';
                }
                const activeNote = document.querySelector('#reserve-status-active .bg-white\\/5');
                if (activeNote) {
                    activeNote.innerText = isEn
                        ? 'Enjoy your evening. You run the bar tonight!'
                        : 'Keyifli akşamlar dileriz. Tezgâhın kontrolü sizde!';
                }
                const deactivateBtn = document.getElementById('btn-deactivate-reserve');
                if (deactivateBtn) {
                    deactivateBtn.innerText = isEn ? 'Remove membership from this device' : 'Bu cihazdan üyeliği kaldır';
                }
                
                if (badgeEl) {
                    badgeEl.textContent = getPlanDisplayName(subInfo.plan);
                }
                if (durationEl) {
                    if (subInfo.plan === 'lifetime') {
                        durationEl.textContent = isEn ? 'Lifetime VIP (Unlimited)' : 'Ömür Boyu (Sınırsız)';
                    } else if (subInfo.daysLeft !== null) {
                        durationEl.textContent = isEn ? `⏳ ${subInfo.daysLeft} Days Left` : `⏳ ${subInfo.daysLeft} Gün Kaldı`;
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
        selectPlan(currentSelectedPlan);
        // A Google session is restored by auth.js, which then asks the server itself.
        const user = root.BarAuth && root.BarAuth.getCurrentUser ? root.BarAuth.getCurrentUser() : null;
        if (!user || user.provider !== 'google') reverifyStoredLicense();

        // Para birimi butonları tıklamaları (USD / EUR)
        document.querySelectorAll('.reserve-currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cur = btn.dataset.currency;
                if (cur === 'usd' || cur === 'eur') {
                    currentCurrency = cur;
                    try {
                        if (root.localStorage) root.localStorage.setItem('barcepte_reserve_currency', cur);
                    } catch(e) {}
                    applyReserveUI();
                    selectPlan(currentSelectedPlan);
                }
            });
        });

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
                const isEn = getCurrentLang() === 'en';
                if (!code.trim()) {
                    if (msgEl) {
                        msgEl.textContent = isEn ? 'Please enter your activation code.' : 'Lütfen aktivasyon kodunuzu giriniz.';
                        msgEl.className = 'text-xs text-rose-400 font-semibold';
                    }
                    return;
                }

                activateBtn.disabled = true;
                activateBtn.textContent = isEn ? 'Checking...' : 'Kontrol ediliyor...';
                if (msgEl) {
                    msgEl.textContent = isEn ? 'Verifying license...' : 'Lisans doğrulanıyor...';
                    msgEl.className = 'text-xs text-amber-400 font-medium animate-pulse';
                }

                try {
                    const result = await verifyAndActivateLicense(code);
                    if (result.success) {
                        const subInfo = getSubscriptionInfo();
                        const planName = getPlanDisplayName(subInfo.plan);
                        if (msgEl) {
                            msgEl.textContent = isEn
                                ? `Congratulations! ${planName} successfully activated.`
                                : `Tebrikler! ${planName} başarıyla aktif edildi.`;
                            msgEl.className = 'text-xs text-emerald-400 font-bold';
                        }
                        setTimeout(() => {
                            applyReserveUI();
                            selectPlan(currentSelectedPlan);
                        }, 500);
                    } else {
                        if (msgEl) {
                            msgEl.textContent = result.reason || (isEn
                                ? 'Invalid activation key. Please check again.'
                                : 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.');
                            msgEl.className = 'text-xs text-rose-400 font-semibold';
                        }
                    }
                } finally {
                    activateBtn.disabled = false;
                    activateBtn.textContent = isEn ? 'Activate' : 'Aktive Et';
                }
            });
        }

        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', () => {
                const isEn = getCurrentLang() === 'en';
                if (confirm(isEn
                    ? 'Are you sure you want to remove your Reserve membership from this device?'
                    : 'Reserve üyeliğinizi bu cihazdan kaldırmak istediğinize emin misiniz?')) {
                    deactivateReserve(true);
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

    function setCurrency(cur) {
        if (cur === 'usd' || cur === 'eur') {
            currentCurrency = cur;
            try { if (root.localStorage) root.localStorage.setItem('barcepte_reserve_currency', cur); } catch(e) {}
            applyReserveUI();
            selectPlan(currentSelectedPlan);
        }
    }

    function getCurrency() {
        return currentCurrency;
    }

    const api = {
        isReserveActive,
        activateReserve,
        verifyAndActivateLicense,
        activateFromCloud,
        deactivateReserve,
        reverifyStoredLicense,
        validateLicenseKey,
        checksum,
        getSubscriptionInfo,
        getPlanFromKey,
        getPlanDisplayName,
        PLANS_CONFIG,
        PLANS_CONFIG_EN,
        PLANS_CONFIG_EUR,
        setCurrency,
        getCurrency,
        applyReserveUI,
        selectPlan
    };
    root.refreshReserveUI = function() {
        applyReserveUI();
        selectPlan(currentSelectedPlan);
    };
    root.BarReserve = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
