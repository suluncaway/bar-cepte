/* Bar Cepte Reserve — Lisans, Abonelik & Üyelik Yönetim Motoru */
(function (root) {
    'use strict';

    // Legacy flags written before server-only activation. They never grant Reserve by themselves;
    // they are kept until the server re-confirms (or explicitly rejects) the stored key.
    const STORAGE_KEY = 'barcepte_reserve_active';
    const KEY_STORAGE = 'barcepte_reserve_license';
    const PLAN_STORAGE = 'barcepte_reserve_plan';
    const EXPIRES_STORAGE = 'barcepte_reserve_expires_at';
    // Server-confirmed entitlement: {key, plan, expiresAt, verifiedAt, binding}. binding is 'account'
    // (claimed with a Google session or returned by the account server), 'device' (claimed without an
    // account) or absent (stored by an older version: unknown).
    const ENTITLEMENT_STORAGE = 'barcepte_reserve_entitlement';
    // A device-bound entitlement set aside while a Google account's own Reserve is shown.
    const DEVICE_ENTITLEMENT_STORAGE = 'barcepte_reserve_device_entitlement';
    // Legacy flags written before server-only activation get a short offline grace period from the
    // first verification attempt, so a returning member is not silently downgraded while offline or
    // signed out. They are never upgraded to a verified entitlement without the server.
    const LEGACY_GRACE_STORAGE = 'barcepte_reserve_legacy_grace_since';
    const LEGACY_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
    const API_ORIGIN = 'https://bar-cepte-webhook.onrender.com';
    const REVALIDATE_MS = 24 * 60 * 60 * 1000;
    // Only these server answers mean "this key is not (or no longer) yours"; anything else is retried.
    const REJECTION_CODES = ['not_issued', 'claimed_elsewhere', 'expired', 'revoked', 'invalid_format'];
    const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const PLANS_CONFIG = {
        monthly: {
            title: 'Aylık Geçiş (30 Gün)',
            price: '40 ₺',
            period: '/ ay',
            badge: 'AYLIK PLAN',
            subtitle: '30 Gün Kesintisiz',
            desc: 'Tek seferlik ödeme: 30 gün geçerli, otomatik yenilenmez. Süre bitince istersen yeni bir geçiş alırsın.',
            checkoutLabel: 'Shopier ile 30 Günlük Geçiş Al',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Yıllık Geçiş (365 Gün)',
            price: '400 ₺',
            period: '/ yıl (33,33 ₺/ay)',
            badge: '%17 tasarruf',
            subtitle: '365 gün erişim',
            desc: 'Ayda 33,33 ₺. Tek seferlik ödeme; bir yıl boyunca uygulamada reklamsız kullanım ve Reserve rozeti, otomatik yenilenmez.',
            checkoutLabel: 'Shopier ile Yıllık Geçiş Al',
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
            desc: 'One-time payment: valid for 30 days and does not renew automatically. Buy a new pass whenever you like.',
            checkoutLabel: 'Secure Checkout via Shopier ($2.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Annual Pass',
            price: '$14.99',
            period: '/ year ($1.25/mo)',
            badge: 'Save 58%',
            subtitle: '365 days of access',
            desc: '$1.25 a month. One-time payment: one year ad-free in the app, with the Reserve badge. Does not renew automatically.',
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
            desc: 'One-time payment: valid for 30 days and does not renew automatically. Buy a new pass whenever you like.',
            checkoutLabel: 'Secure Checkout via Shopier (€2.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51736039'
        },
        annual: {
            title: 'Annual Pass',
            price: '€13.99',
            period: '/ year (€1.16/mo)',
            badge: 'Save 60%',
            subtitle: '365 days of access',
            desc: '€1.16 a month. One-time payment: one year ad-free in the app, with the Reserve badge. Does not renew automatically.',
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

    // Format/typo check only (130-bit keys and legacy 4-character keys). It is not proof of purchase:
    // only the license server decides whether a key is valid.
    function validateLicenseKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') return false;
        const key = rawKey.trim().toUpperCase();
        const parts = key.split('-');
        if (parts.length !== 4 || parts[0] !== 'RESERVE' || !/^[A-Z0-9]{4}$/.test(parts[1]) || !/^[0-9A-F]{4}$/.test(parts[3])) return false;
        const legacy = /^[A-Z0-9]{4}$/.test(parts[2]);
        const current = parts[2].length === 26 && parts[2].split('').every(c => KEY_ALPHABET.includes(c));
        return (legacy || current) && checksum(parts[1] + parts[2]) === parts[3];
    }

    function getPlanFromKey(rawKey) {
        if (!rawKey) return 'lifetime';
        const key = rawKey.trim().toUpperCase();
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
            case 'annual': return 'Yıllık Abonelik';
            case 'lifetime': return 'Ömür Boyu VIP (Lifetime Pass)';
            default: return 'Reserve Üyeliği';
        }
    }

    function isValidSubscription(plan, expiresAt) {
        return ['monthly', 'annual', 'lifetime'].includes(plan) && typeof expiresAt === 'number' && Number.isFinite(expiresAt) &&
            (plan === 'lifetime' ? expiresAt === 0 : expiresAt > 0);
    }

    function readEntitlement() {
        try {
            const value = JSON.parse(root.localStorage.getItem(ENTITLEMENT_STORAGE) || 'null');
            if (!value || typeof value.key !== 'string' || !isValidSubscription(value.plan, value.expiresAt)) return null;
            return { key: value.key, plan: value.plan, expiresAt: value.expiresAt, verifiedAt: Number(value.verifiedAt) || 0,
                ...(value.binding === 'account' || value.binding === 'device' ? { binding: value.binding } : {}) };
        } catch {
            return null;
        }
    }

    function readLegacyKey() {
        try {
            const key = root.localStorage.getItem(KEY_STORAGE) || '';
            return root.localStorage.getItem(STORAGE_KEY) === 'true' && key ? key.trim().toUpperCase() : '';
        } catch {
            return '';
        }
    }

    function clearStoredReserve() {
        for (const key of [ENTITLEMENT_STORAGE, DEVICE_ENTITLEMENT_STORAGE, STORAGE_KEY, KEY_STORAGE, PLAN_STORAGE, EXPIRES_STORAGE, LEGACY_GRACE_STORAGE]) {
            try { root.localStorage.removeItem(key); } catch {}
        }
    }

    // Legacy flags within their grace period (started by the first verification attempt).
    function legacyGrace() {
        const key = readLegacyKey();
        if (!key || !validateLicenseKey(key)) return null;
        let since = 0, plan = '', expiresAt = 0;
        try {
            since = Number(root.localStorage.getItem(LEGACY_GRACE_STORAGE)) || 0;
            plan = root.localStorage.getItem(PLAN_STORAGE) || '';
            expiresAt = Number(root.localStorage.getItem(EXPIRES_STORAGE)) || 0;
        } catch { return null; }
        const now = Date.now();
        if (!since || since > now || now - since >= LEGACY_GRACE_MS) return null;
        if (!['monthly', 'annual', 'lifetime'].includes(plan)) plan = getPlanFromKey(key);
        if (plan === 'lifetime') expiresAt = 0;
        if (expiresAt > 0 && now >= expiresAt) return null;
        return { key, plan, expiresAt, graceUntil: since + LEGACY_GRACE_MS };
    }
    function startLegacyGrace() {
        try { if (!root.localStorage.getItem(LEGACY_GRACE_STORAGE)) root.localStorage.setItem(LEGACY_GRACE_STORAGE, String(Date.now())); } catch {}
    }

    // Only a server-confirmed entitlement counts; backups and local registries do not. Legacy flags
    // count only during their grace period (see legacyGrace), marked with grace: true.
    function getSubscriptionInfo() {
        const entitlement = readEntitlement();
        if (!entitlement) {
            const grace = legacyGrace();
            if (grace) {
                const daysLeft = grace.expiresAt > 0 ? Math.max(0, Math.ceil((grace.expiresAt - Date.now()) / 86400000)) : null;
                return { active: true, expired: false, plan: grace.plan, key: grace.key, expiresAt: grace.expiresAt, daysLeft, grace: true, graceUntil: grace.graceUntil };
            }
            return { active: false, expired: false, plan: null, key: null, expiresAt: 0, daysLeft: null };
        }
        const { key, plan, expiresAt } = entitlement;
        if (expiresAt > 0 && Date.now() >= expiresAt) {
            return { active: false, expired: true, plan, key, expiresAt, daysLeft: 0 };
        }
        const daysLeft = expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : null;
        return { active: true, expired: false, plan, key, expiresAt, daysLeft };
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
                id = 'dev_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
                root.localStorage.setItem('barcepte_device_id', id);
            }
            return id;
        } catch {
            return 'dev_unknown';
        }
    }

    // Changes whenever Reserve is removed or the account changes; responses started before are ignored.
    let entitlementGeneration = 0;
    function ownerScope() {
        const user = root.BarAuth && typeof root.BarAuth.getCurrentUser === 'function' ? root.BarAuth.getCurrentUser() : null;
        return user ? user.uid : null;
    }

    // Kept for compatibility: activation without the license server is no longer possible.
    function activateReserve() { return false; }
    function activateFromCloud() { return false; }

    // Stores a subscription that came from the license/account server. Returns false if invalid
    // or if it cannot be persisted (then nothing is granted).
    function acceptServerSubscription(subscription, options = {}) {
        if (!subscription || typeof subscription.key !== 'string' || !validateLicenseKey(subscription.key)) return false;
        const { plan, expiresAt } = subscription;
        if (!isValidSubscription(plan, expiresAt) || (expiresAt > 0 && expiresAt <= Date.now())) return false;
        const key = subscription.key.trim().toUpperCase();
        const previous = readEntitlement();
        // Same key re-confirmed without new information keeps what we already know about its binding.
        const binding = options.binding === 'account' || options.binding === 'device' ? options.binding
            : (previous && previous.key === key ? previous.binding : undefined);
        try {
            // An account's Reserve must not erase a different key bound to this device: set it aside.
            if (binding === 'account' && previous && previous.key !== key && previous.binding === 'device') {
                root.localStorage.setItem(DEVICE_ENTITLEMENT_STORAGE, JSON.stringify(previous));
            }
            root.localStorage.setItem(ENTITLEMENT_STORAGE, JSON.stringify({
                key, plan, expiresAt, verifiedAt: Date.now(), ...(binding ? { binding } : {})
            }));
            for (const key of [STORAGE_KEY, KEY_STORAGE, PLAN_STORAGE, EXPIRES_STORAGE, LEGACY_GRACE_STORAGE]) root.localStorage.removeItem(key);
        } catch {
            try { root.localStorage.removeItem(ENTITLEMENT_STORAGE); } catch {}
            return false;
        }
        applyReserveUI();
        return isReserveActive();
    }

    // Without a session the server only accepts a key bound to this device. With a session a new
    // claim binds to the account, but a "restored" answer may be either binding.
    function claimBinding(withAccount, data) {
        if (data && (data.boundTo === 'account' || data.boundTo === 'device')) return data.boundTo;
        if (!withAccount) return 'device';
        return data && data.restored ? undefined : 'account';
    }

    // One claim request. Resolves to {status:'ok', data} | {status:'rejected', data} | {status:'retry', reason}.
    async function requestClaim(cleanKey) {
        const auth = root.BarAuth;
        const user = auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
        const token = auth && typeof auth.getSessionToken === 'function' ? auth.getSessionToken() : '';
        // A Google profile without a live session would silently bind the key to this device instead of the account.
        if (user && user.provider === 'google' && !token) return { status: 'retry', session: true };
        const withAccount = Boolean(token);
        const deviceId = auth && typeof auth.getDeviceId === 'function' ? auth.getDeviceId() : getLocalDeviceId();
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), 65000) : null;
        try {
            const resp = await root.fetch(API_ORIGIN + '/api/claim-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
                body: JSON.stringify({ key: cleanKey, deviceId }),
                signal: controller ? controller.signal : undefined
            });
            // Render can answer a cold start with an HTML error page; never let that surface as a network error.
            let data = {};
            try { data = await resp.json(); } catch { data = {}; }
            if (resp.ok && data && data.success === true) return { status: 'ok', data, binding: claimBinding(withAccount, data) };
            // Only the server's explicit rejection codes remove a key; any other 409 (conflict,
            // proxy or deployment error) is retried like a network failure.
            const explicit = (resp.status === 400 || resp.status === 409 || resp.status === 410) &&
                data && REJECTION_CODES.includes(data.code);
            return { status: explicit ? 'rejected' : 'retry', data, httpStatus: resp.status };
        } catch {
            return { status: 'retry' };
        } finally {
            if (timeout !== null) clearTimeout(timeout);
        }
    }

    async function verifyAndActivateLicense(key) {
        const isEn = getCurrentLang() === 'en';
        if (!key || typeof key !== 'string' || !key.trim()) {
            return { success: false, reason: isEn ? 'Please enter an activation key.' : 'Lütfen bir aktivasyon kodu giriniz.' };
        }
        const cleanKey = key.trim().toUpperCase();
        // Only reject input that cannot be a key at all; the server is the authority on format and validity.
        if (cleanKey.length > 100 || !/^[A-Z0-9-]+$/.test(cleanKey)) {
            return { success: false, reason: isEn ? 'Invalid activation key. Please check again.' : 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.' };
        }
        const generation = entitlementGeneration;
        const owner = ownerScope();
        const result = await requestClaim(cleanKey);
        if (generation !== entitlementGeneration || owner !== ownerScope()) {
            return { success: false, reason: isEn ? 'Your account changed during verification. Please try again.' : 'Doğrulama sırasında hesap değişti. Lütfen tekrar deneyiniz.' };
        }
        if (result.session) {
            return { success: false, reason: isEn ? 'Please sign in with Google again to link the key to your account.' : 'Kodu hesabına bağlamak için Google ile tekrar giriş yapınız.' };
        }
        if (result.status === 'ok') {
            const { plan, expiresAt } = result.data;
            if (acceptServerSubscription({ key: cleanKey, plan, expiresAt }, { binding: result.binding })) {
                return { success: true, plan, expiresAt, message: result.data.message };
            }
            return { success: false, reason: isEn
                ? 'License verification could not be completed. Please try again.'
                : 'Lisans doğrulaması tamamlanamadı. Lütfen tekrar deneyiniz.' };
        }
        const data = result.data || {};
        if (result.status === 'rejected') {
            if (result.httpStatus === 409) {
                return { success: false, reason: data.reason || (isEn
                    ? 'This license key was already claimed by another user or device. Licenses are single-use.'
                    : 'Bu lisans anahtarı başka bir kullanıcı ya da cihazda kullanılmış. Lisanslar tek kullanımlıktır.') };
            }
            return { success: false, reason: data.reason || (isEn ? 'Invalid activation key. Please check again.' : 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.') };
        }
        if (result.httpStatus === 429) {
            return { success: false, reason: data.reason || (isEn ? 'Too many attempts. Please wait a little and try again.' : 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyiniz.') };
        }
        if (result.httpStatus) {
            return { success: false, reason: isEn
                ? 'The license server could not confirm your key right now. Your key is safe; please try again in a minute.'
                : 'Lisans sunucusu şu an kodunu doğrulayamadı. Kodun geçerli kalır; bir dakika sonra tekrar dene.' };
        }
        return { success: false, reason: isEn
            ? 'License verification is unavailable. Please connect to the internet and try again.'
            : 'Lisans doğrulaması yapılamadı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.' };
    }

    // Re-confirms the stored key with the server (about once a day, or once for legacy flags).
    // Removes Reserve only when the server explicitly rejects the key; network/server errors keep it.
    let revalidating = null;
    function revalidate(options = {}) {
        if (revalidating) return revalidating;
        const entitlement = readEntitlement();
        const key = entitlement ? entitlement.key : readLegacyKey();
        if (!key) return Promise.resolve({ status: 'none' });
        if (entitlement && !options.force && Date.now() - entitlement.verifiedAt < REVALIDATE_MS) return Promise.resolve({ status: 'fresh' });
        if (!entitlement) { startLegacyGrace(); applyReserveUI(); }
        if (root.navigator && root.navigator.onLine === false) return Promise.resolve({ status: 'offline' });
        const generation = entitlementGeneration;
        const owner = ownerScope();
        revalidating = requestClaim(key).then(result => {
            if (generation !== entitlementGeneration || owner !== ownerScope()) return { status: 'stale' };
            if (result.status === 'ok') {
                acceptServerSubscription({ key, plan: result.data.plan, expiresAt: result.data.expiresAt }, { binding: result.binding });
                return { status: 'confirmed' };
            }
            if (result.status === 'rejected') {
                entitlementGeneration++;
                clearStoredReserve();
                applyReserveUI();
                return { status: 'removed', code: result.data && result.data.code };
            }
            return { status: 'kept', session: Boolean(result.session) };
        }).finally(() => { revalidating = null; });
        return revalidating;
    }

    // Called by auth.js after sign-out (the account is already cleared). Account-bound Reserve is
    // removed (a device-bound key set aside for it comes back); device-bound Reserve stays; an
    // entitlement of unknown binding is re-checked with the server as this device and, until that
    // succeeds, marked as due for re-checking.
    function releaseAccountEntitlement() {
        entitlementGeneration++;
        const entitlement = readEntitlement();
        let parked = null;
        try { parked = JSON.parse(root.localStorage.getItem(DEVICE_ENTITLEMENT_STORAGE) || 'null'); } catch {}
        try { root.localStorage.removeItem(DEVICE_ENTITLEMENT_STORAGE); } catch {}
        if (entitlement && entitlement.binding === 'account') {
            try { root.localStorage.removeItem(ENTITLEMENT_STORAGE); } catch {}
            if (parked && typeof parked.key === 'string' && validateLicenseKey(parked.key) && isValidSubscription(parked.plan, parked.expiresAt)) {
                try { root.localStorage.setItem(ENTITLEMENT_STORAGE, JSON.stringify({ ...parked, binding: 'device', verifiedAt: 0 })); } catch {}
            }
        } else if (entitlement && !entitlement.binding) {
            try { root.localStorage.setItem(ENTITLEMENT_STORAGE, JSON.stringify({ ...entitlement, verifiedAt: 0 })); } catch {}
            revalidate({ force: true }).catch(() => {});
        }
        applyReserveUI();
    }

    function deactivateReserve(reload = true) {
        entitlementGeneration++;
        clearStoredReserve();
        try {
            if (reload && root.location) root.location.reload();
            else applyReserveUI();
        } catch {}
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

    // A gentle, once-per-session hint when earlier Reserve cannot be verified (offline/signed out).
    function verificationNotice(info, isEn) {
        if (info.grace) {
            const days = Math.max(1, Math.ceil((info.graceUntil - Date.now()) / 86400000));
            return isEn
                ? `We could not verify your Reserve yet. Connect to the internet (and sign in with Google if you linked it to your account) within ${days} days to keep it.`
                : `Reserve üyeliğini henüz doğrulayamadık. Korumak için ${days} gün içinde internete bağlan (hesabına bağladıysan Google ile giriş yap).`;
        }
        if (!info.active && readLegacyKey() && !readEntitlement()) {
            return isEn
                ? 'Your earlier Reserve could not be verified. Connect to the internet or sign in with Google to restore it.'
                : 'Önceki Reserve üyeliğin doğrulanamadı. Geri yüklemek için internete bağlan ya da Google ile giriş yap.';
        }
        return '';
    }
    function showVerificationNotice(message) {
        if (!message) return;
        try {
            if (root.sessionStorage && root.sessionStorage.getItem('barcepte_reserve_notice') === message) return;
            if (root.sessionStorage) root.sessionStorage.setItem('barcepte_reserve_notice', message);
        } catch {}
        if (typeof root.showToast === 'function') { try { root.showToast(message, 'info'); } catch {} }
    }

    function applyReserveUI() {
        if (root.AndroidBridge && typeof root.AndroidBridge.setReserveActive === 'function') {
            try { root.AndroidBridge.setReserveActive(isReserveActive()); } catch {}
        }
        if (typeof document === 'undefined') return;
        const active = isReserveActive();
        const isEn = getCurrentLang() === 'en';
        const notice = verificationNotice(getSubscriptionInfo(), isEn);
        showVerificationNotice(notice);
        const msgEl = document.getElementById('reserve-key-msg');
        if (msgEl && notice && !msgEl.textContent) { msgEl.textContent = notice; msgEl.className = 'text-xs text-amber-300 font-medium'; }
        
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
            reserveBtn.title = isEn ? 'Pocket Bar Reserve — Ad-free app experience' : 'Bar Cepte Reserve — Uygulamada reklamsız deneyim';
        }

        // Modal başlık & üst rozet
        const reserveClubBadge = document.querySelector('#reserve-modal .inline-flex');
        if (reserveClubBadge) {
            reserveClubBadge.innerHTML = isEn ? '<span><i class="bci bci-crown" aria-hidden="true"></i></span> RESERVE MEMBERSHIP' : '<span><i class="bci bci-crown" aria-hidden="true"></i></span> RESERVE ÜYELİĞİ';
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
                ? 'Use the Pocket Bar app without ads, unlock the party planner and support its independent development.'
                : 'Bar Cepte uygulamasını reklamsız kullan, parti planlayıcısını aç ve bağımsız gelişimine destek ol.';
        }

        // Avantajlar listesi (4 Bullets)
        const reserveBullets = document.querySelectorAll('#reserve-status-inactive .bg-black\\/40 > div span:last-child');
        if (reserveBullets.length >= 4) {
            // Only benefits the code actually delivers (see applyReserveUI and the Android bridge).
            reserveBullets[0].innerHTML = isEn
                ? '<strong>Ad-free in the app:</strong> No ad slots, banners or interstitials in the web app and the Android app; the affiliate banner is hidden too. Ads may still appear on recipe and guide content pages.'
                : "<strong>Uygulama içinde reklamsız:</strong> Web uygulamasında ve Android uygulamasında reklam alanları, banner ve geçiş reklamları gösterilmez; satış ortaklığı bandı da gizlenir. Tarif ve rehber içerik sayfalarında reklam görünebilir.";
            reserveBullets[1].innerHTML = isEn
                ? '<strong>Party planner:</strong> Total ingredients (cl), bottle counts and missing items added to your shopping list for 10–50 guests.'
                : '<strong>Parti planlayıcısı:</strong> 10–50 misafir için toplam malzeme (cl), şişe sayısı ve eksiklerin alışveriş listesine eklenmesi.';
            reserveBullets[2].innerHTML = isEn
                ? '<strong>Reserve badge:</strong> Shown next to the logo and on your account.'
                : '<strong>Reserve rozeti:</strong> Logonun yanında ve hesabında görünür.';
            reserveBullets[3].innerHTML = isEn
                ? '<strong>Support independent work:</strong> Helps keep every recipe and guide free.'
                : '<strong>Bağımsız geliştirmeye destek:</strong> Tüm tarif ve rehberlerin ücretsiz kalmasına katkı sağlar.';
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
        if (keyInput) keyInput.placeholder = 'RESERVE-XXXX-…';
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
                    activeDesc.innerText = notice || (isEn
                        ? 'The ad-free app experience and your Reserve badge are active on this device.'
                        : 'Uygulama içi reklamsız deneyim ve Reserve rozetin bu cihazda devrede.');
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
        if (root.BarPartyUI && typeof root.BarPartyUI.refresh === 'function') root.BarPartyUI.refresh();
    }

    function scheduleRevalidation() {
        if (typeof root.setTimeout !== 'function') return;
        // Give auth.js time to restore a Google session before asking the server.
        root.setTimeout(() => { revalidate().catch(() => {}); }, 4000);
        if (typeof root.setInterval === 'function') root.setInterval(() => { revalidate().catch(() => {}); }, 60 * 60 * 1000);
        if (typeof root.addEventListener === 'function') root.addEventListener('online', () => { revalidate().catch(() => {}); });
    }

    function init() {
        applyReserveUI();
        selectPlan(currentSelectedPlan);
        scheduleRevalidation();

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
        acceptServerSubscription,
        revalidate,
        deactivateReserve,
        releaseAccountEntitlement,
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
