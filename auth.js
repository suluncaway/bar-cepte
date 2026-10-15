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
    const SESSION_KEY='barcepte_verified_session';
    const REVISION_KEY='barcepte_cloud_revision';
    const API_ORIGIN='https://bar-cepte-webhook.onrender.com';
    let sessionToken='',cloudRevision=null,loginAttempt=0;
    try {sessionToken=root.sessionStorage.getItem(SESSION_KEY)||'';const r=root.sessionStorage.getItem(REVISION_KEY);cloudRevision=r===null?null:Number(r);}catch {}

    let currentUser = null;

    // --- Güvenlik & Doğrulama Yardımcıları ---
    function showAlert(msg) {
        if (typeof root.alert === 'function') {
            root.alert(msg);
        }
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
                (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')) ||
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

    function getSessionToken() {return sessionToken;}
    function sessionHeaders() {return sessionToken?{Authorization:'Bearer '+sessionToken}:{};}
    async function accountRequest(path,options={}) {
        const requestToken=sessionToken;
        const controller=typeof AbortController==='function'?new AbortController():null;
        const timer=controller?setTimeout(()=>controller.abort(),20000):null;
        try {
            const response=await root.fetch(API_ORIGIN+path,{...options,headers:{'Content-Type':'application/json',...sessionHeaders(),...(options.headers||{})},signal:controller?controller.signal:undefined});
            const data=await response.json();
            if(path!=='/api/auth/google' && sessionToken!==requestToken)return {success:false,reason:'Oturum değişti; işlem uygulanmadı.'};
            if(!response.ok) {
                if(response.status===401 && sessionToken===requestToken){sessionToken='';try {root.sessionStorage.removeItem(SESSION_KEY);}catch {}}
                return {success:false,reason:data.reason||'İşlem tamamlanamadı.',status:response.status};
            }
            return data;
        } catch {return {success:false,reason:getCurrentLang()==='en'?'Connection unavailable. Your local data is preserved.':'Bağlantı kurulamadı. Yerel verilerin korunuyor.'};}
        finally {if(timer!==null)clearTimeout(timer);}
    }
    function rememberRevision(revision) {
        cloudRevision=revision;try {root.sessionStorage.setItem(REVISION_KEY,String(revision));}catch {}
    }
    function applyServerSubscription(subscription) {
        const user=getCurrentUser();if(!user)return;
        user.isReserve=Boolean(subscription);
        user.plan=subscription?subscription.plan:null;
        user.reserveKey=subscription?subscription.key:'';
        user.reserveExpiresAt=subscription?subscription.expiresAt:0;
        saveUser(user);
        if(root.BarReserve) {
            if(subscription)root.BarReserve.activateFromCloud({...subscription,active:true});
            else if(root.BarReserve.deactivateReserve)root.BarReserve.deactivateReserve(false);
        }
    }
    function applyCloudData(valid,user) {
        const keys={favorites:'favoriteCocktails',customs:'customRecipes',shopping:'shoppingList',selected:'selectedIngredients'};
        const previous={};for(const key of Object.values(keys))previous[key]=root.localStorage.getItem(key);
        // One local recovery copy prevents an automatic cloud restore from silently losing unsynced edits.
        root.localStorage.setItem('barcepte_pre_restore_'+(root.localStorage.getItem('barcepte_data_owner')||user.uid),JSON.stringify(collectCurrentLocalData()));
        try {
            for(const [field,key] of Object.entries(keys))root.localStorage.setItem(key,JSON.stringify(valid[field]));
            root.localStorage.setItem('barcepte_data_owner',user.uid);
        } catch(error) {
            for(const [key,value] of Object.entries(previous)){try {if(value===null)root.localStorage.removeItem(key);else root.localStorage.setItem(key,value);}catch {}}
            throw error;
        }
        if(typeof root.applyCloudBackup==='function')root.applyCloudBackup(valid);
    }
    async function syncToCloud() {
        const user=getCurrentUser();
        if(!sessionToken || !user || user.provider!=='google')return {success:false,reason:getCurrentLang()==='en'?'Sign in with Google to use cloud backup.':'Bulut yedeği için Google ile giriş yapınız.'};
        if(cloudRevision===null)return {success:false,reason:'Önce bulut yedeğini geri yükleyiniz.'};
        try {
            const owner=root.localStorage.getItem('barcepte_data_owner');
            if(owner && owner!==user.uid)return {success:false,reason:'Bu cihazdaki veriler başka hesaba ait. Önce kendi bulut yedeğinizi açınız.'};
            const data=root.BarSecurity.backup(collectCurrentLocalData());
            const result=await accountRequest('/api/account/backup',{method:'PUT',body:JSON.stringify({data,revision:cloudRevision})});
            if(result.success){rememberRevision(result.revision);user.lastSync=result.updatedAt;saveUser(user);root.localStorage.setItem('barcepte_data_owner',user.uid);}
            return result;
        }catch {return {success:false,reason:'Yerel veriler okunamadı; yedek gönderilmedi.'};}
    }
    async function syncFromCloud() {
        const user=getCurrentUser();
        if(!sessionToken || !user || user.provider!=='google')return {success:false,reason:'Google ile giriş yapınız.'};
        const result=await accountRequest('/api/account/backup');
        if(!result.success)return result;
        applyServerSubscription(result.subscription);
        if(!result.backup){rememberRevision(0);return {success:false,notFound:true,reason:'Bulutta henüz yedek yok.'};}
        try {
            const valid=root.BarSecurity.backup(result.backup.data);
            applyCloudData(valid,user);rememberRevision(result.backup.revision);
            const current=getCurrentUser();current.lastSync=result.backup.updatedAt;saveUser(current);
            return {success:true,data:valid};
        }catch {return {success:false,reason:'Yedek geri yüklenemedi. Yerel veriler korunuyor.'};}
    }
    async function handleGoogleCredentialResponse(response) {
        if(!response || !response.credential)return;
        const attempt=++loginAttempt;
        const result=await accountRequest('/api/auth/google',{method:'POST',body:JSON.stringify({credential:response.credential})});
        if(attempt!==loginAttempt)return;
        if(!result.success){showAlert(result.reason);return;}
        sessionToken=result.token;rememberRevision(null);
        try {root.sessionStorage.setItem(SESSION_KEY,sessionToken);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        const googleUser=saveUser({...result.user,isReserve:false,createdAt:Date.now()});
        applyServerSubscription(result.subscription);
        const restore=await syncFromCloud();
        if(attempt!==loginAttempt)return;
        if(restore.notFound) {
            try {
                const owner=root.localStorage.getItem('barcepte_data_owner');
                if(owner && owner!==googleUser.uid)applyCloudData({favorites:[],customs:[],shopping:[],selected:[]},googleUser);
            }catch {}
            await syncToCloud();
        }
        closeAuthModal();
        showAlert(getCurrentLang()==='en'?`Welcome, ${googleUser.name}!`: `Hoş geldin, ${googleUser.name}!`);
    }
    async function restoreSession() {
        if(!sessionToken)return;
        const result=await accountRequest('/api/account');
        if(result.success){saveUser({...result.user,lastSync:getCurrentUser()?.lastSync||0});applyServerSubscription(result.subscription);}
    }

    // --- Demo / Misafir Girişi (Test & Hızlı Kullanım) ---
    function loginAsDemoUser() {
        clearSession();
        const demoUser = {
            uid: 'demo_user_barmen',
            name: getCurrentLang() === 'en' ? 'Guest Bartender' : 'Demo Barmen',
            email: getCurrentLang() === 'en' ? 'bartender@pocketbar.app' : 'barmen@barcepte.com.tr',
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
        showAlert(getCurrentLang() === 'en'
            ? 'Guest Bartender mode: data stays on this device.'
            : 'Misafir modu: veriler bu cihazda tutulur.');
    }

    function clearSession() {
        loginAttempt++;
        const token=sessionToken;sessionToken='';cloudRevision=null;
        try {root.sessionStorage.removeItem(SESSION_KEY);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        if(token && root.fetch)root.fetch(API_ORIGIN+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});
        if(getCurrentUser()?.provider==='google' && root.BarReserve?.deactivateReserve)root.BarReserve.deactivateReserve(false);
    }
    function logout() {
        clearSession();
        currentUser = null;
        try {
            root.localStorage.removeItem(AUTH_USER_KEY);
        } catch {}
        updateAuthUI();
        closeAuthModal();
        showAlert(getCurrentLang() === 'en' ? 'Successfully signed out.' : 'Başarıyla çıkış yapıldı.');
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
            const firstName = user.name.split(' ')[0] || (getCurrentLang() === 'en' ? 'My Account' : 'Hesabım');
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
            if (authBtnLabel) authBtnLabel.textContent = getCurrentLang() === 'en' ? 'Sign In' : 'Giriş Yap';
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
            if (emailEl) emailEl.textContent = user.email || (getCurrentLang() === 'en' ? 'Connected Local Account' : 'Bağlı Yerel Hesap');
            if (avatarEl) {
                if (user.picture) {
                    avatarEl.innerHTML = `<img src="${user.picture}" alt="" class="w-14 h-14 rounded-2xl object-cover border border-amber-400/40 shadow-md">`;
                } else {
                    avatarEl.innerHTML = `<div class="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-300">${user.name.charAt(0).toUpperCase()}</div>`;
                }
            }

            if (tierBadgeEl) {
                if (user.isReserve) {
                    const planText = user.plan === 'monthly'
                        ? (getCurrentLang() === 'en' ? 'MONTHLY' : 'AYLIK')
                        : (user.plan === 'lifetime'
                            ? (getCurrentLang() === 'en' ? 'LIFETIME' : 'ÖMÜR BOYU')
                            : (getCurrentLang() === 'en' ? 'ANNUAL' : 'YILLIK'));
                    tierBadgeEl.textContent = (getCurrentLang() === 'en' ? '👑 RESERVE VIP MEMBER (' : '👑 RESERVE VIP ÜYE (') + planText + ')';
                    tierBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950';
                } else {
                    tierBadgeEl.textContent = getCurrentLang() === 'en' ? '🍸 BARTENDER CLUB MEMBER (FREE)' : '🍸 BARMEN KULÜBÜ ÜYESİ (ÜCRETSİZ)';
                    tierBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10';
                }
            }

            if (syncTimeEl) {
                syncTimeEl.textContent = user.lastSync > 0
                    ? new Date(user.lastSync).toLocaleTimeString(getCurrentLang() === 'en' ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : (getCurrentLang() === 'en' ? 'Not synced yet' : 'Henüz eşitlenmedi');
            }

            const cloudEnabled=user.provider==='google' && Boolean(sessionToken);
            for(const id of ['btn-auth-sync-now','btn-auth-restore-cloud']) {
                const button=document.getElementById(id);if(button)button.disabled=!cloudEnabled;
            }
            const cloudStatus=document.getElementById('auth-cloud-status');
            if(cloudStatus)cloudStatus.textContent=cloudEnabled?(getCurrentLang()==='en'?'● Connected':'● Bağlı'):(getCurrentLang()==='en'?'Local mode':'Yerel mod');

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

        container.textContent=getCurrentLang()==='en'?'Google sign-in is unavailable. Please try again shortly.':'Google girişine şu an ulaşılamıyor. Biraz sonra tekrar deneyiniz.';
    }

    function init() {
        loadStoredUser();
        updateAuthUI();
        restoreSession();

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
                if (confirm(getCurrentLang() === 'en' ? 'Are you sure you want to sign out of your account?' : 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?')) {
                    logout();
                }
            });
        }

        const syncNowBtn = document.getElementById('btn-auth-sync-now');
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                syncNowBtn.disabled=true;
                const result = await syncToCloud();
                syncNowBtn.disabled=false;
                if (result.success) {
                    alert(getCurrentLang() === 'en' ? 'Cloud sync completed! All your data is safe.' : 'Bulut senkronizasyonu tamamlandı! Tüm verileriniz güvende.');
                    renderAuthModalState();
                } else {
                    alert((getCurrentLang() === 'en' ? 'Sync failed: ' : 'Senkronizasyon başarısız: ') + result.reason);
                }
            });
        }

        const restoreBtn=document.getElementById('btn-auth-restore-cloud');
        if(restoreBtn)restoreBtn.addEventListener('click',async()=>{
            if(!confirm(getCurrentLang()==='en'?'Restore your cloud backup? Current data will be saved locally.':'Bulut yedeği geri yüklensin mi? Mevcut veriler cihazda yedeklenecek.'))return;
            restoreBtn.disabled=true;const result=await syncFromCloud();restoreBtn.disabled=false;
            showAlert(result.success?(getCurrentLang()==='en'?'Cloud backup restored.':'Bulut yedeği geri yüklendi.'):result.reason);
        });
        const bindLicenseBtn = document.getElementById('btn-bind-account-license');
        if (bindLicenseBtn) {
            bindLicenseBtn.addEventListener('click', async () => {
                const input = document.getElementById('auth-license-input');
                const rawKey = input ? input.value.trim() : '';
                if (!rawKey) {
                    alert(getCurrentLang() === 'en' ? 'Please enter an activation key.' : 'Lütfen bir aktivasyon kodu giriniz.');
                    return;
                }

                const origText = bindLicenseBtn.textContent;
                bindLicenseBtn.disabled = true;
                bindLicenseBtn.textContent = getCurrentLang() === 'en' ? 'Checking...' : 'Kontrol ediliyor...';

                try {
                    if (root.BarReserve && typeof root.BarReserve.verifyAndActivateLicense === 'function') {
                        const result = await root.BarReserve.verifyAndActivateLicense(rawKey);
                        if (result.success) {
                            alert(getCurrentLang() === 'en' ? '🎉 Your license key was successfully linked to your account!' : '🎉 Lisans anahtarınız hesabınıza başarıyla bağlandı ve tek kullanımlık olarak mühürlendi!');
                            if (input) input.value = '';
                            renderAuthModalState();
                            updateAuthUI();
                        } else {
                            alert(result.reason || (getCurrentLang() === 'en' ? 'Activation could not be completed.' : 'Aktivasyon gerçekleştirilemedi.'));
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
                                alert(getCurrentLang() === 'en' ? '🎉 Your license key was successfully linked to your account!' : '🎉 Lisans anahtarınız hesabınıza başarıyla bağlandı ve tek kullanımlık olarak mühürlendi!');
                                if (input) input.value = '';
                                renderAuthModalState();
                                updateAuthUI();
                            } else {
                                alert(getCurrentLang() === 'en' ? 'Activation could not be completed.' : 'Aktivasyon gerçekleştirilemedi.');
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
        getSessionToken,
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
        getClaimedLicenses,
        updateAuthUI,
        renderAuthModalState
    };

    root.BarAuth = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
