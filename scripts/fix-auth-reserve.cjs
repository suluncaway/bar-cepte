const fs = require('node:fs');
let a = fs.readFileSync('auth.js','utf8');
const replaceBetween = (text,start,end,value) => text.slice(0,text.indexOf(start))+value+text.slice(text.indexOf(end,text.indexOf(start)));
a = a.replace('let currentUser = null;', 'let currentUser = null;\n    let googleCredential = null;');
a = replaceBetween(a,'    function getDeviceId() {','    // --- Tek Kullanımlık',`    function getDeviceId() {
        let id = root.localStorage.getItem(DEVICE_ID_KEY);
        if (!/^dev_[a-f0-9]{64}$/.test(id || '')) {
            const bytes = new Uint8Array(32);
            root.crypto.getRandomValues(bytes);
            id = 'dev_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            root.localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
    }

    // This only supplies a credential; the server, not parseJwt, verifies identity.
    function getIdToken() {
        const user = getCurrentUser();
        const profile = googleCredential && parseJwt(googleCredential);
        if (!user || user.provider !== 'google' || !profile ||
            'google_' + profile.sub !== user.uid || !Number.isFinite(profile.exp) ||
            profile.exp * 1000 <= Date.now()) return null;
        return googleCredential;
    }

`);
a = replaceBetween(a,'    function canUseLicenseKey(', '    function collectCurrentLocalData()',`    function canUseLicenseKey(rawKey) {
        const allowed = Boolean(root.BarReserve && root.BarReserve.validateLicenseKey(rawKey));
        return { allowed, reason: allowed ? 'Server verification required.' : 'Invalid key format.' };
    }

    // Compatibility only: local registries never grant or deny entitlement.
    function claimLicenseKey() { return false; }
    function markLicenseClaimedLocally() { return false; }

    function transitionAccount(nextUser) {
        const previous = getCurrentUser();
        if ((previous && previous.uid) === (nextUser && nextUser.uid)) return;
        const scope = previous ? previous.uid : 'guest_' + getDeviceId();
        // Save first; a storage failure must abort the transition, not erase data.
        root.localStorage.setItem(CLOUD_BACKUP_PREFIX + scope, JSON.stringify({
            updatedAt: Date.now(), data: collectCurrentLocalData(),
            reserve: root.BarReserve ? root.BarReserve.getSubscriptionInfo() : null
        }));
        for (const key of ['favoriteCocktails', 'customRecipes', 'shoppingList', 'selectedIngredients']) {
            root.localStorage.setItem(key, '[]');
        }
        if (root.BarReserve) root.BarReserve.deactivateReserve();
        googleCredential = null;
    }

`);
a = replaceBetween(a,'            // Eğer bulutta aktif','            return { success: true, data: valid };', '            // Backups contain data only; they cannot activate Reserve.\n');
a = a.replace('return { success: true, data: valid };', "return { success: true, localOnly: true, storage: 'local', data: valid };");
a = a.replace('return { success: true, timestamp: user.lastSync };', "return { success: true, localOnly: true, storage: 'local', timestamp: user.lastSync };");
a = replaceBetween(a,'        // Mevcut tarayıcıda zaten aktif','        saveUser(googleUser);', '        transitionAccount(googleUser);\n        googleCredential = response.credential;\n');
a = a.replace('        saveUser(demoUser);','        transitionAccount(demoUser);\n        saveUser(demoUser);\n        syncFromCloud();');
a = a.replace('    function logout() {\n        currentUser = null;', '    function logout() {\n        transitionAccount(null);\n        currentUser = null;');
a = a.replace('        getDeviceId,','        getDeviceId,\n        getIdToken,');
a = a.replace('isReserve: Boolean(raw.isReserve)', 'isReserve: false');
a = a.replace(/Bulut/g,'Yerel hesap yedeği').replace(/bulut/g,'yerel hesap yedeği').replace(/Cloud/g,'Cloud');
a = a.replace(/Cloud Sync/g,'Local account backup').replace(/cloud/g,'local backup').replace(/across devices/g,'on this device').replace(/are syncing/g,'are backed up on this device');
// Retain legacy storage key/API names, not the misleading cloud label.
a = a.replace("'barcepte_local backup_data_'", "'barcepte_cloud_data_'");
a = a.replace(/\/\*\*[\s\S]*?\*\//, '/** Local account profiles and on-device backups; not a cloud service. */');
fs.writeFileSync('auth.js',a);
let r = fs.readFileSync('reserve.js','utf8');
r = replaceBetween(r,'    // Sabit kurucu','    const ', '');
// remove the master constant (the first const after its comment)
r = r.replace(/    const MASTER_KEYS = new Set\(\[[\s\S]*?\]\);\s*/, '');
r = r.replace(/        if \(MASTER_KEYS.has\(key\)\) return .*;\r?\n/g,'');
r = replaceBetween(r,'    function getSubscriptionInfo()', '    function selectPlan(', `    // Entitlement is session-only: persisted flags and backups are not proof.
    let verifiedSubscription = null;
    let entitlementGeneration = 0;
    let expiryTimer = null;
    function ownerScope() {
        const user = root.BarAuth && root.BarAuth.getCurrentUser();
        return user ? user.uid : null;
    }
    function getSubscriptionInfo() {
        const sub = verifiedSubscription;
        const now = Date.now();
        const elapsed = sub && root.performance ? root.performance.now() - sub.monotonicStart : 0;
        const expired = Boolean(sub && sub.expiresAt > 0 &&
            (now >= sub.expiresAt || elapsed >= sub.remainingMs || now < sub.observedAt));
        if (!sub || sub.owner !== ownerScope() || expired) {
            return { active: false, expired, plan: null, key: null, expiresAt: 0, daysLeft: null };
        }
        return { active: true, expired: false, plan: sub.plan, key: sub.key,
            expiresAt: sub.expiresAt, daysLeft: sub.expiresAt ? Math.max(0, Math.ceil((sub.expiresAt - now) / 86400000)) : null };
    }
    function isReserveActive() { return getSubscriptionInfo().active; }
    // Legacy synchronous entry points cannot provide server verification.
    function activateReserve() { return false; }
    function activateFromCloud() { return false; }

    async function verifyAndActivateLicense(key) {
        const failure = { success: false, reason: getCurrentLang() === 'en'
            ? 'Activation requires server verification. Please reconnect and retry.'
            : 'Aktivasyon için sunucu doğrulaması gerekli. Bağlanıp tekrar deneyin.' };
        if (!validateLicenseKey(key)) return failure;
        const cleanKey = key.trim().toUpperCase();
        const generation = entitlementGeneration;
        const owner = ownerScope();
        try {
            const auth = root.BarAuth;
            if (!auth) return failure;
            const user = auth.getCurrentUser();
            const payload = { key: cleanKey, deviceId: auth.getDeviceId() };
            if (user && user.provider === 'google') {
                payload.idToken = auth.getIdToken();
                if (!payload.idToken) return failure;
            }
            const response = await root.fetch('https://bar-cepte-webhook.onrender.com/api/claim-license', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || data.success !== true || generation !== entitlementGeneration || owner !== ownerScope()) return failure;
            const { plan, expiresAt } = data;
            if (!['monthly', 'annual', 'lifetime'].includes(plan) || !Number.isFinite(expiresAt) ||
                (plan === 'lifetime' ? expiresAt !== 0 : expiresAt <= Date.now())) return failure;
            verifiedSubscription = { key: cleanKey, plan, expiresAt, owner, observedAt: Date.now(),
                monotonicStart: root.performance ? root.performance.now() : 0, remainingMs: expiresAt - Date.now() };
            root.localStorage.setItem(KEY_STORAGE, cleanKey);
            root.localStorage.setItem(PLAN_STORAGE, plan);
            root.localStorage.setItem(EXPIRES_STORAGE, String(expiresAt));
            scheduleExpiryCheck();
            applyReserveUI();
            return { success: true, plan, expiresAt };
        } catch {
            return failure;
        }
    }
    function scheduleExpiryCheck() {
        if (expiryTimer) root.clearTimeout(expiryTimer);
        if (!verifiedSubscription || !verifiedSubscription.expiresAt || !root.setTimeout) return;
        expiryTimer = root.setTimeout(() => {
            applyReserveUI();
            if (isReserveActive()) scheduleExpiryCheck();
        }, Math.min(60000, Math.max(1, verifiedSubscription.expiresAt - Date.now())));
        if (expiryTimer && expiryTimer.unref) expiryTimer.unref();
    }
    function deactivateReserve() {
        entitlementGeneration++;
        verifiedSubscription = null;
        if (expiryTimer) root.clearTimeout(expiryTimer);
        // Keep historical key metadata for recovery; it never grants entitlement.
        try { root.localStorage.removeItem(STORAGE_KEY); } catch {}
        applyReserveUI();
    }

`);
r = r.replace('    function applyReserveUI() {',`    function applyReserveUI() {
        if (root.AndroidBridge && typeof root.AndroidBridge.setReserveActive === 'function') {
            try { root.AndroidBridge.setReserveActive(isReserveActive()); } catch {}
        }`);
fs.writeFileSync('reserve.js',r);
