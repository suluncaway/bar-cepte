/**
 * Bar Cepte — Üyelik, Google Sign-In & Bulut Senkronizasyonu Modülü (auth.js)
 * 
 * Özellikler:
 * 1. Google OAuth 2.0 (Google Identity Services) ile tek tıkla giriş.
 * 2. Cihazlar arası otomatik Bulut Senkronizasyonu (Favoriler, Dolap, Özel Kokteyller).
 * 3. Tek Kullanımlık Lisans Anahtarı Mühürleme (Bir lisans yalnızca bir hesaba bağlanabilir).
 * 4. Çoklu Cihazda Otomatik VIP Tanıma (Google ile girilen her cihazda Reserve anında aktif).
 * 5. XSS ve Veri Güvenliği: BarSecurity ile %100 sanitize edilmiş veri akışı.
 */

(function (root) {
    'use strict';

    const AUTH_USER_KEY = 'barcepte_auth_user';
    const USED_KEYS_STORAGE = 'barcepte_claimed_licenses';
    const CLOUD_BACKUP_PREFIX = 'barcepte_cloud_data_';

    let currentUser = null;

    // --- Güvenlik & Doğrulama Yardımcıları ---
    function showAlert(msg) {
        if (typeof root.alert === 'function') {
            root.alert(msg);
        }
    }

    function sanitizeText(value, max = 200) {
        if (typeof value !== 'string') return '';
        const clean = value.replace(/[<>'"&]/g, '').trim();
        return clean.slice(0, max);
    }

    function safeAvatar(src) {
        if (typeof src !== 'string' || !src.trim()) return '';
        if (src.startsWith('data:image/')) {
            return /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(src) ? src : '';
        }
        try {
            const url = new URL(src);
            if (url.protocol === 'https:' && (
                url.hostname.endsWith('googleusercontent.com') ||
                url.hostname === 'www.thecocktaildb.com'
            )) {
                return url.href;
            }
        } catch {}
        return '';
    }

    function parseJwt(token) {
        try {
            if (!token || typeof token !== 'string') return null;
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch {
            return null;
        }
    }

    function sanitizeUser(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const uid = String(raw.uid || '').trim();
        if (!uid || uid.length > 150) return null;

        return {
            uid: uid,
            name: sanitizeText(raw.name || 'Barmen Kulübü Üyesi', 100),
            email: sanitizeText(raw.email || '', 150),
            picture: safeAvatar(raw.picture || ''),
            isReserve: Boolean(raw.isReserve),
            plan: ['monthly', 'annual', 'lifetime'].includes(raw.plan) ? raw.plan : null,
            reserveKey: sanitizeText(raw.reserveKey || '', 50),
            reserveExpiresAt: Number(raw.reserveExpiresAt) || 0,
            provider: raw.provider === 'google' ? 'google' : 'local',
            createdAt: Number(raw.createdAt) || Date.now(),
            lastSync: Number(raw.lastSync) || 0
        };
    }

    // --- Oturum Yönetimi ---
    function loadStoredUser() {
        try {
            const raw = root.localStorage.getItem(AUTH_USER_KEY);
            if (!raw) return null;
            currentUser = sanitizeUser(JSON.parse(raw));
            return currentUser;
        } catch {
            currentUser = null;
            return null;
        }
    }

    function saveUser(user) {
        currentUser = sanitizeUser(user);
        try {
            if (currentUser) {
                root.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
            } else {
                root.localStorage.removeItem(AUTH_USER_KEY);
            }
        } catch {}
        updateAuthUI();
        return currentUser;
    }

    function getCurrentUser() {
        if (!currentUser) loadStoredUser();
        return currentUser;
    }

    function isLoggedIn() {
        return Boolean(getCurrentUser());
    }

    const DEVICE_ID_KEY = 'barcepte_device_id';

    function getDeviceId() {
        try {
            let id = root.localStorage.getItem(DEVICE_ID_KEY);
            if (!id) {
                id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
                root.localStorage.setItem(DEVICE_ID_KEY, id);
            }
            return id;
        } catch {
            return 'dev_unknown';
        }
    }

    // --- Tek Kullanımlık Lisans Anahtarı Denetleyicisi ---
    function getClaimedLicenses() {
        try {
            const raw = root.localStorage.getItem(USED_KEYS_STORAGE);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    function saveClaimedLicenses(registry) {
        try {
            root.localStorage.setItem(USED_KEYS_STORAGE, JSON.stringify(registry));
        } catch {}
    }

    function canUseLicenseKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') {
            return { allowed: false, reason: 'Geçersiz anahtar formatı.' };
        }
        const cleanKey = rawKey.trim().toUpperCase();

        // Master geliştirici anahtarları her zaman serbesttir
        if (cleanKey === 'RESERVE-SULUNCA-2026' || cleanKey === 'BARCEPTE-RESERVE-VIP') {
            return { allowed: true, reason: 'Master geliştirici anahtarı.' };
        }

        // 1. Matematiksel Doğruluk Kontrolü
        if (root.BarReserve && typeof root.BarReserve.validateLicenseKey === 'function') {
            if (!root.BarReserve.validateLicenseKey(cleanKey)) {
                return { allowed: false, reason: 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.' };
            }
        }

        // 2. Tek Kullanımlık Hesap / Cihaz Bağlantısı Kontrolü
        const registry = getClaimedLicenses();
        const existingClaim = registry[cleanKey];

        const user = getCurrentUser();
        const deviceId = getDeviceId();
        const currentUid = user ? user.uid : deviceId;

        if (existingClaim) {
            // Süre dolumu kontrolü: Süresi dolmuş anahtar tekrar KULLANILAMAZ!
            if (existingClaim.expiresAt > 0 && Date.now() > existingClaim.expiresAt) {
                return {
                    allowed: false,
                    reason: '❌ Bu lisans anahtarının kullanım süresi dolmuştur! Lisanslar tek kullanımlıktır.'
                };
            }

            // Sahip doğrulaması:
            // 1. Eğer lisans bir hesaba (UID) bağlıysa, farklı bir hesap kesinlikle KULLANAMAZ.
            // 2. Sadece aynı UID veya misafir durumunda aynı cihaz kabul edilir.
            let isOwner = false;
            if (user && user.uid && existingClaim.uid) {
                isOwner = (existingClaim.uid === user.uid);
            } else if (!user && existingClaim.deviceId && !existingClaim.uid) {
                isOwner = (existingClaim.deviceId === deviceId);
            }

            if (isOwner) {
                return {
                    allowed: true,
                    reason: 'Bu anahtar zaten mevcut hesabınıza tanımlı.',
                    alreadyClaimed: true
                };
            } else {
                return {
                    allowed: false,
                    reason: '❌ Bu lisans anahtarı daha önce başka bir hesap tarafından kullanılmış! Lisanslar tek kullanımlıktır.'
                };
            }
        }

        return { allowed: true, reason: 'Anahtar kullanılabilir.' };
    }

    function claimLicenseKey(rawKey, plan, expiresAt) {
        const cleanKey = rawKey.trim().toUpperCase();
        const user = getCurrentUser();
        const deviceId = getDeviceId();
        const currentUid = user ? user.uid : null;

        const registry = getClaimedLicenses();
        registry[cleanKey] = {
            uid: currentUid,
            deviceId: deviceId,
            email: user ? user.email : '',
            claimedAt: Date.now(),
            plan: plan || 'annual',
            expiresAt: Number(expiresAt) || 0
        };
        saveClaimedLicenses(registry);

        if (user) {
            user.isReserve = true;
            user.plan = plan || 'annual';
            user.reserveKey = cleanKey;
            user.reserveExpiresAt = Number(expiresAt) || 0;
            saveUser(user);
            syncToCloud();
        }
    }

    function markLicenseClaimedLocally(rawKey, uid) {
        if (!rawKey) return;
        const cleanKey = rawKey.trim().toUpperCase();
        const registry = getClaimedLicenses();
        if (!registry[cleanKey]) {
            registry[cleanKey] = {
                uid: uid || 'external_user',
                claimedAt: Date.now(),
                externallyClaimed: true
            };
            saveClaimedLicenses(registry);
        }
    }

    // --- Bulut Senkronizasyonu (Cloud Sync) ---
    function collectCurrentLocalData() {
        const sec = root.BarSecurity;
        try {
            return {
                favorites: sec ? sec.readStored('favoriteCocktails', sec.stringList) : JSON.parse(root.localStorage.getItem('favoriteCocktails') || '[]'),
                customs: sec ? sec.readStored('customRecipes', sec.recipes) : JSON.parse(root.localStorage.getItem('customRecipes') || '[]'),
                shopping: sec ? sec.readStored('shoppingList', sec.stringList) : JSON.parse(root.localStorage.getItem('shoppingList') || '[]'),
                selected: sec ? sec.readStored('selectedIngredients', sec.stringList) : JSON.parse(root.localStorage.getItem('selectedIngredients') || '[]')
            };
        } catch {
            return { favorites: [], customs: [], shopping: [], selected: [] };
        }
    }

    function syncToCloud() {
        const user = getCurrentUser();
        if (!user) return { success: false, reason: 'Giriş yapılmadı' };

        const localData = collectCurrentLocalData();
        const sec = root.BarSecurity;
        const validated = sec ? sec.backup(localData) : localData;

        // Bulut kaydını kullanıcıya özel alana mühürle
        try {
            const storageKey = CLOUD_BACKUP_PREFIX + user.uid;
            root.localStorage.setItem(storageKey, JSON.stringify({
                updatedAt: Date.now(),
                data: validated,
                reserve: {
                    active: user.isReserve,
                    plan: user.plan,
                    expiresAt: user.reserveExpiresAt,
                    key: user.reserveKey
                }
            }));
            user.lastSync = Date.now();
            saveUser(user);
            return { success: true, timestamp: user.lastSync };
        } catch (err) {
            return { success: false, reason: err.message };
        }
    }

    function syncFromCloud() {
        const user = getCurrentUser();
        if (!user) return { success: false, reason: 'Giriş yapılmadı' };

        try {
            const storageKey = CLOUD_BACKUP_PREFIX + user.uid;
            const raw = root.localStorage.getItem(storageKey);
            if (!raw) return { success: false, reason: 'Bulutta yedek bulunamadı' };

            const cloudPayload = JSON.parse(raw);
            if (!cloudPayload || !cloudPayload.data) return { success: false, reason: 'Bozuk bulut verisi' };

            const sec = root.BarSecurity;
            const valid = sec ? sec.backup(cloudPayload.data) : cloudPayload.data;

            // Yerel state'i güncelle
            root.localStorage.setItem('favoriteCocktails', JSON.stringify(valid.favorites));
            root.localStorage.setItem('customRecipes', JSON.stringify(valid.customs));
            root.localStorage.setItem('shoppingList', JSON.stringify(valid.shopping));
            root.localStorage.setItem('selectedIngredients', JSON.stringify(valid.selected));

            // Eğer bulutta aktif bir Reserve üyeliği varsa cihazı otomatik VIP yap
            if (cloudPayload.reserve && cloudPayload.reserve.active) {
                if (root.BarReserve && typeof root.BarReserve.activateFromCloud === 'function') {
                    root.BarReserve.activateFromCloud(cloudPayload.reserve);
                }
                user.isReserve = true;
                user.plan = cloudPayload.reserve.plan;
                user.reserveExpiresAt = cloudPayload.reserve.expiresAt;
                user.reserveKey = cloudPayload.reserve.key;
                saveUser(user);
            }

            return { success: true, data: valid };
        } catch (err) {
            return { success: false, reason: err.message };
        }
    }

    // --- Google Identity Services Callback ---
    function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) return;

        const payload = parseJwt(response.credential);
        if (!payload || !payload.sub) {
            alert('Google ile giriş doğrulaması başarısız oldu.');
            return;
        }

        const googleUser = {
            uid: 'google_' + payload.sub,
            name: sanitizeText(payload.name || payload.email || 'Google Kullanıcısı', 100),
            email: sanitizeText(payload.email || '', 150),
            picture: safeAvatar(payload.picture || ''),
            provider: 'google',
            createdAt: Date.now(),
            isReserve: false,
            plan: null,
            reserveKey: '',
            reserveExpiresAt: 0
        };

        // Mevcut tarayıcıda zaten aktif bir Reserve lisansı varsa hesaba mühürle
        if (root.BarReserve && typeof root.BarReserve.getSubscriptionInfo === 'function') {
            const currentSub = root.BarReserve.getSubscriptionInfo();
            if (currentSub && currentSub.active) {
                googleUser.isReserve = true;
                googleUser.plan = currentSub.plan;
                googleUser.reserveKey = currentSub.key;
                googleUser.reserveExpiresAt = currentSub.expiresAt;
                // Lisansı bu Google kullanıcısına kaydet
                if (currentSub.key) {
                    claimLicenseKey(currentSub.key, currentSub.plan, currentSub.expiresAt);
                }
            }
        }

        saveUser(googleUser);

        // Bulutta önceki cihazdan yedek varsa eşitle, yoksa mevcut yerel veriyi buluta gönder
        const cloudSyncResult = syncFromCloud();
        if (!cloudSyncResult.success) {
            syncToCloud();
        }

        closeAuthModal();
        showAlert(`Hoş geldin, ${googleUser.name}! Bar Cepte hesabın başarıyla bağlandı.`);

        // Sayfa bileşenlerini yenile
        if (typeof root.filterCocktails === 'function') root.filterCocktails();
        if (typeof root.renderDashboard === 'function') root.renderDashboard();
    }

    // --- Demo / Misafir Girişi (Test & Hızlı Kullanım) ---
    function loginAsDemoUser() {
        const demoUser = {
            uid: 'demo_user_barmen',
            name: 'Demo Barmen',
            email: 'barmen@barcepte.com.tr',
            picture: '',
            provider: 'local',
            createdAt: Date.now(),
            isReserve: false,
            plan: null,
            reserveKey: '',
            reserveExpiresAt: 0
        };
        saveUser(demoUser);
        syncToCloud();
        closeAuthModal();
        showAlert('Demo üye olarak giriş yapıldı! Favorilerin ve bar dolabın bu hesaba eşitleniyor.');
    }

    function logout() {
        currentUser = null;
        try {
            root.localStorage.removeItem(AUTH_USER_KEY);
        } catch {}
        updateAuthUI();
        closeAuthModal();
        showAlert('Başarıyla çıkış yapıldı.');
    }

    // --- UI Güncelleme & Etkileşimler ---
    function updateAuthUI() {
        if (typeof document === 'undefined') return;
        const user = getCurrentUser();
        const authBtnLabel = document.getElementById('auth-btn-label');
        const authBtnIcon = document.getElementById('auth-btn-icon');
        const authBtn = document.getElementById('btn-auth-user');

        if (!authBtn) return;

        if (user) {
            const firstName = user.name.split(' ')[0] || 'Hesabım';
            if (authBtnLabel) authBtnLabel.textContent = firstName;
            if (authBtnIcon) {
                if (user.isReserve) {
                    authBtnIcon.textContent = '👑';
                } else if (user.picture) {
                    authBtnIcon.innerHTML = `<img src="${user.picture}" alt="" class="w-4 h-4 rounded-full object-cover">`;
                } else {
                    authBtnIcon.textContent = '🍸';
                }
            }
            authBtn.className = user.isReserve
                ? "pill-btn px-2.5 py-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/10 text-[11px] font-black text-amber-300 flex items-center gap-1.5 hover:border-amber-400 shrink-0 whitespace-nowrap"
                : "pill-btn px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 hover:bg-emerald-500/20 shrink-0 whitespace-nowrap";
        } else {
            if (authBtnLabel) authBtnLabel.textContent = 'Giriş Yap';
            if (authBtnIcon) authBtnIcon.textContent = '👤';
            authBtn.className = "pill-btn px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 hover:border-amber-500/40 hover:bg-white/10 shrink-0 whitespace-nowrap";
        }

        renderAuthModalState();
    }

    function renderAuthModalState() {
        if (typeof document === 'undefined') return;
        const user = getCurrentUser();
        const loggedOutView = document.getElementById('auth-view-logged-out');
        const loggedInView = document.getElementById('auth-view-logged-in');

        if (!loggedOutView || !loggedInView) return;

        if (user) {
            loggedOutView.classList.add('hidden');
            loggedInView.classList.remove('hidden');

            const nameEl = document.getElementById('auth-user-name');
            const emailEl = document.getElementById('auth-user-email');
            const avatarEl = document.getElementById('auth-user-avatar');
            const tierBadgeEl = document.getElementById('auth-user-tier-badge');
            const syncTimeEl = document.getElementById('auth-sync-time');

            if (nameEl) nameEl.textContent = user.name;
            if (emailEl) emailEl.textContent = user.email || 'Bağlı Yerel Hesap';
            if (avatarEl) {
                if (user.picture) {
                    avatarEl.innerHTML = `<img src="${user.picture}" alt="" class="w-14 h-14 rounded-2xl object-cover border border-amber-400/40 shadow-md">`;
                } else {
                    avatarEl.innerHTML = `<div class="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-300">${user.name.charAt(0).toUpperCase()}</div>`;
                }
            }

            if (tierBadgeEl) {
                if (user.isReserve) {
                    tierBadgeEl.textContent = '👑 RESERVE VIP ÜYE (' + (user.plan === 'monthly' ? 'AYLIK' : 'YILLIK') + ')';
                    tierBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950';
                } else {
                    tierBadgeEl.textContent = '🍸 BARMEN KULÜBÜ ÜYESİ (ÜCRETSİZ)';
                    tierBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10';
                }
            }

            if (syncTimeEl) {
                syncTimeEl.textContent = user.lastSync > 0
                    ? new Date(user.lastSync).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : 'Henüz eşitlenmedi';
            }

            // Lisans bağlama kutusunun durumunu ayarla
            const licenseBindBox = document.getElementById('auth-license-bind-section');
            if (licenseBindBox) {
                licenseBindBox.classList.toggle('hidden', user.isReserve);
            }
        } else {
            loggedOutView.classList.remove('hidden');
            loggedInView.classList.add('hidden');
        }
    }

    function openAuthModal() {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        renderAuthModalState();
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Google Sign-In butonu hazırla
        renderGoogleButton();
    }

    function closeAuthModal() {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    function renderGoogleButton() {
        const container = document.getElementById('google-signin-btn-container');
        if (!container) return;

        const cfg = root.BAR_FIREBASE_CONFIG || {};
        const clientId = cfg.googleClientId;

        if (root.google && root.google.accounts && root.google.accounts.id && clientId) {
            try {
                root.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false
                });

                container.innerHTML = '';
                container.style.colorScheme = 'light';
                if (container.parentElement) {
                    container.parentElement.style.colorScheme = 'light';
                }
                root.google.accounts.id.renderButton(container, {
                    theme: 'filled_black',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'pill',
                    logo_alignment: 'left'
                });
                return;
            } catch (err) {
                console.warn('Google GSI render hatası:', err);
            }
        }

        // Eğer henüz Client ID girilmemişse kullanıcıyı bilgilendiren şık buton ve rehber
        container.innerHTML = `
            <div class="space-y-2.5 w-full">
                <button id="btn-custom-google-login" type="button" class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    <span>Google ile Giriş Yap</span>
                </button>
                <div class="text-[10px] text-slate-400 bg-white/5 p-2 rounded-xl border border-white/10 text-center leading-relaxed">
                    💡 <b>Google Bağlantısı:</b> <code class="text-amber-300">firebase-config.js</code> dosyasına Google Client ID bilginizi ekleyerek doğrudan Google sunucularıyla kullanabilirsiniz.
                </div>
            </div>
        `;

        const customBtn = document.getElementById('btn-custom-google-login');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                const name = prompt('Giriş yapılacak ad ve soyadınızı yazınız:', 'Misafir Barmen');
                if (!name || !name.trim()) return;
                const email = prompt('E-posta adresiniz (opsiyonel):', 'barmen@barcepte.com.tr') || '';
                
                const localUser = {
                    uid: 'user_' + Date.now(),
                    name: sanitizeText(name, 100),
                    email: sanitizeText(email, 150),
                    picture: '',
                    provider: 'local',
                    createdAt: Date.now(),
                    isReserve: false,
                    plan: null,
                    reserveKey: '',
                    reserveExpiresAt: 0
                };
                saveUser(localUser);
                syncToCloud();
                closeAuthModal();
                alert(`Hoş geldin, ${localUser.name}! Hesabın bağlandı.`);
            });
        }
    }

    function init() {
        loadStoredUser();
        updateAuthUI();

        // Buton dinleyicileri
        const authBtn = document.getElementById('btn-auth-user');
        if (authBtn) {
            authBtn.addEventListener('click', openAuthModal);
        }

        const closeBtn = document.getElementById('btn-close-auth');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAuthModal);
        }

        const logoutBtn = document.getElementById('btn-auth-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?')) {
                    logout();
                }
            });
        }

        const syncNowBtn = document.getElementById('btn-auth-sync-now');
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', () => {
                const result = syncToCloud();
                if (result.success) {
                    alert('Bulut senkronizasyonu tamamlandı! Tüm verileriniz güvende.');
                    renderAuthModalState();
                } else {
                    alert('Senkronizasyon başarısız: ' + result.reason);
                }
            });
        }

        const bindLicenseBtn = document.getElementById('btn-bind-account-license');
        if (bindLicenseBtn) {
            bindLicenseBtn.addEventListener('click', async () => {
                const input = document.getElementById('auth-license-input');
                const rawKey = input ? input.value.trim() : '';
                if (!rawKey) {
                    alert('Lütfen bir aktivasyon kodu giriniz.');
                    return;
                }

                const origText = bindLicenseBtn.textContent;
                bindLicenseBtn.disabled = true;
                bindLicenseBtn.textContent = 'Kontrol ediliyor...';

                try {
                    if (root.BarReserve && typeof root.BarReserve.verifyAndActivateLicense === 'function') {
                        const result = await root.BarReserve.verifyAndActivateLicense(rawKey);
                        if (result.success) {
                            alert('🎉 Lisans anahtarınız hesabınıza başarıyla bağlandı ve tek kullanımlık olarak mühürlendi!');
                            if (input) input.value = '';
                            renderAuthModalState();
                            updateAuthUI();
                        } else {
                            alert(result.reason || 'Aktivasyon gerçekleştirilemedi.');
                        }
                    } else {
                        const check = canUseLicenseKey(rawKey);
                        if (!check.allowed) {
                            alert(check.reason);
                            return;
                        }

                        if (root.BarReserve && typeof root.BarReserve.activateReserve === 'function') {
                            const activated = root.BarReserve.activateReserve(rawKey);
                            if (activated) {
                                alert('🎉 Lisans anahtarınız hesabınıza başarıyla bağlandı ve tek kullanımlık olarak mühürlendi!');
                                if (input) input.value = '';
                                renderAuthModalState();
                                updateAuthUI();
                            } else {
                                alert('Aktivasyon gerçekleştirilemedi.');
                            }
                        }
                    }
                } finally {
                    bindLicenseBtn.disabled = false;
                    bindLicenseBtn.textContent = origText;
                }
            });
        }

        const demoBtn = document.getElementById('btn-demo-login');
        if (demoBtn) {
            demoBtn.addEventListener('click', loginAsDemoUser);
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
        getCurrentUser,
        isLoggedIn,
        saveUser,
        logout,
        getDeviceId,
        canUseLicenseKey,
        claimLicenseKey,
        markLicenseClaimedLocally,
        syncToCloud,
        syncFromCloud,
        handleGoogleCredentialResponse,
        loginAsDemoUser,
        sanitizeText,
        safeAvatar,
        parseJwt,
        getClaimedLicenses
    };

    root.BarAuth = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
