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
    let sessionToken='',cloudRevision=null,loginAttempt=0,personalDataVersion=0,inventoryDataVersion=0;
    try {sessionToken=root.sessionStorage.getItem(SESSION_KEY)||'';const r=root.sessionStorage.getItem(REVISION_KEY);cloudRevision=r===null?null:Number(r);}catch {}

    let currentUser = null;
    let googleCredential = null;
    // Subscription from the latest authenticated account response; memory only.
    let accountSubscription = null;

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
            // Stored profiles never carry entitlement; Reserve state comes from BarReserve,
            // which only trusts server responses. Fields kept for older readers.
            isReserve: false,
            plan: null,
            reserveKey: '',
            reserveExpiresAt: 0,
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

    // The device id is a random secret the license server binds guest claims to.
    // Earlier ids are kept unchanged: claims already made on this device are bound to them.
    function getDeviceId() {
        try {
            const stored = root.localStorage.getItem(DEVICE_ID_KEY);
            if (stored && stored !== 'dev_unknown' && /^[A-Za-z0-9_-]{8,200}$/.test(stored)) return stored;
            if (!root.crypto || typeof root.crypto.getRandomValues !== 'function') return null;
            const bytes = root.crypto.getRandomValues(new Uint8Array(32));
            const id = 'dev_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            root.localStorage.setItem(DEVICE_ID_KEY, id);
            return id;
        } catch {
            return null;
        }
    }

    // The Google credential from this page's sign-in, only while it is unexpired and matches the
    // current profile. A profile restored from storage has none. The server, not parseJwt, verifies it.
    function getIdToken() {
        const user = getCurrentUser();
        const profile = googleCredential ? parseJwt(googleCredential) : null;
        if (!user || user.provider !== 'google' || !profile || 'google_' + profile.sub !== user.uid ||
            !Number.isFinite(profile.exp) || profile.exp * 1000 <= Date.now()) return null;
        return googleCredential;
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

    // Advisory pre-check only: a format check plus local hints that can say "no" early.
    // It never grants anything; only the license server's answer activates Reserve.
    function canUseLicenseKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') {
            return { allowed: false, reason: 'Geçersiz anahtar formatı.' };
        }
        const cleanKey = rawKey.trim().toUpperCase();

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

        if (existingClaim && typeof existingClaim === 'object') {
            // Süre dolumu kontrolü: Süresi dolmuş anahtar tekrar KULLANILAMAZ!
            if (existingClaim.expiresAt > 0 && Date.now() > existingClaim.expiresAt) {
                return {
                    allowed: false,
                    reason: 'Bu lisans anahtarının kullanım süresi dolmuştur! Lisanslar tek kullanımlıktır.'
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
                    reason: 'Bu lisans anahtarı daha önce başka bir hesap tarafından kullanılmış! Lisanslar tek kullanımlıktır.'
                };
            }
        }

        return { allowed: true, reason: 'Sunucu doğrulaması gerekli.' };
    }

    // Compatibility API: records a local hint for canUseLicenseKey and returns false.
    // A local record never activates Reserve or marks the profile as a member.
    function claimLicenseKey(rawKey, plan, expiresAt) {
        if (!rawKey || typeof rawKey !== 'string') return false;
        const cleanKey = rawKey.trim().toUpperCase();
        const user = getCurrentUser();
        const registry = getClaimedLicenses();
        registry[cleanKey] = {
            uid: user ? user.uid : null,
            deviceId: getDeviceId(),
            claimedAt: Date.now(),
            plan: ['monthly', 'annual', 'lifetime'].includes(plan) ? plan : null,
            expiresAt: Number(expiresAt) || 0
        };
        saveClaimedLicenses(registry);
        return false;
    }

    function markLicenseClaimedLocally() {
        return false;
    }

    // --- Bulut Senkronizasyonu (Cloud Sync) ---
    const PERSONAL_LIST_KEYS = { favorites: 'favoriteCocktails', customs: 'customRecipes', shopping: 'shoppingList', selected: 'selectedIngredients' };
    const ACCOUNT_BACKUP_PREFIX = 'barcepte_cloud_data_';

    function readStoredList(key) {
        try {
            const value = JSON.parse(root.localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function collectCurrentLocalData() {
        const sec = root.BarSecurity;
        if (sec) {
            try {
                return {
                    favorites: sec.readStored('favoriteCocktails', sec.stringList),
                    customs: sec.readStored('customRecipes', sec.recipes),
                    shopping: sec.readStored('shoppingList', sec.stringList),
                    selected: sec.readStored('selectedIngredients', sec.stringList),
                    preferences: sec.preferences({...sec.readStored('personalPreferences',sec.preferences)}),
                    history: sec.readStored('preparationHistory',sec.history),
                    inventory: sec.inventory({...{items:[],deductions:[],receipts:[]},...sec.readStored('barInventory',sec.inventory)})
                };
            } catch {}
        }
        const data = {};
        for (const [field, key] of Object.entries(PERSONAL_LIST_KEYS)) data[field] = readStoredList(key);
        return data;
    }

    // On sign-out the account's lists are saved on this device under its uid, then cleared,
    // so the next person using the device does not see them. Saving first: if it fails, nothing is cleared.
    function backupAndClearLocalData(user) {
        const reserve = reserveInfo();
        root.localStorage.setItem(ACCOUNT_BACKUP_PREFIX + user.uid, JSON.stringify({
            updatedAt: Date.now(),
            data: collectCurrentLocalData(),
            // Only a key to show the server again at the next sign-in; it grants nothing by itself.
            reserveKey: reserve && reserve.active && reserve.key ? reserve.key : ''
        }));
        for (const key of Object.values(PERSONAL_LIST_KEYS)) root.localStorage.setItem(key, '[]');
        if (typeof root.applyCloudBackup === 'function') {
            try { root.applyCloudBackup({ favorites: [], customs: [], shopping: [], selected: [] }); } catch {}
        }
    }

    // Brings back a signed-out local account's lists, unless someone has used the device since,
    // and asks the license server again about the key it had redeemed.
    function restoreLocalAccountBackup(uid) {
        try {
            const saved = JSON.parse(root.localStorage.getItem(ACCOUNT_BACKUP_PREFIX + uid) || 'null');
            if (!saved || typeof saved !== 'object') return false;
            if (typeof saved.reserveKey === 'string' && saved.reserveKey && root.BarReserve &&
                typeof root.BarReserve.verifyAndActivateLicense === 'function') {
                root.BarReserve.verifyAndActivateLicense(saved.reserveKey).catch(() => {});
            }
            if (Object.values(PERSONAL_LIST_KEYS).some(key => readStoredList(key).length)) return false;
            if (!saved.data || typeof saved.data !== 'object') return false;
            const sec = root.BarSecurity;
            const restored = {};
            for (const [field, key] of Object.entries(PERSONAL_LIST_KEYS)) {
                let value = Array.isArray(saved.data[field]) ? saved.data[field] : [];
                if (sec) value = field === 'customs' ? sec.recipes(value) : sec.stringList(value);
                restored[field] = value;
            }
            for (const [field, key] of Object.entries(PERSONAL_LIST_KEYS)) root.localStorage.setItem(key, JSON.stringify(restored[field]));
            if (typeof root.applyCloudBackup === 'function') root.applyCloudBackup(restored);
            return true;
        } catch {
            return false;
        }
    }

    function getSessionToken() {return sessionToken;}
    function sessionHeaders() {return sessionToken?{Authorization:'Bearer '+sessionToken}:{};}
    async function accountRequest(path,options={}) {
        const requestToken=sessionToken;
        const controller=typeof AbortController==='function'?new AbortController():null;
        const timer=controller?setTimeout(()=>controller.abort(),65000):null;
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
    function monotonicNow() {
        try {return root.performance && typeof root.performance.now==='function'?root.performance.now():null;}catch {return null;}
    }
    // Only called with a response to an authenticated account request; held in memory for this session.
    function applyServerSubscription(subscription) {
        const user=getCurrentUser();
        accountSubscription=null;
        if(user && sessionToken && subscription && typeof subscription==='object') {
            const {plan,expiresAt}=subscription;
            if(['monthly','annual','lifetime'].includes(plan) && typeof expiresAt==='number' && Number.isFinite(expiresAt) &&
                (plan==='lifetime'?expiresAt===0:expiresAt>Date.now())) {
                accountSubscription={plan,expiresAt,key:sanitizeText(String(subscription.key||''),80),owner:user.uid,token:sessionToken,
                    monotonicStart:monotonicNow(),remainingMs:expiresAt?expiresAt-Date.now():Infinity};
            }
        }
        if(root.BarReserve && typeof root.BarReserve.applyReserveUI==='function')root.BarReserve.applyReserveUI();
        updateAuthUI();
    }
    function getAccountSubscription() {
        const user=getCurrentUser();
        if(!accountSubscription || !user || accountSubscription.owner!==user.uid || accountSubscription.token!==sessionToken)return null;
        const {token,...subscription}=accountSubscription;
        return subscription;
    }
    function reserveInfo() {
        try {return root.BarReserve && typeof root.BarReserve.getSubscriptionInfo==='function'?root.BarReserve.getSubscriptionInfo():null;}
        catch {return null;}
    }
    function applyCloudData(valid,user) {
        valid={...valid,preferences:valid.preferences||root.BarSecurity.preferences({}),history:valid.history||[],inventory:valid.inventory||{items:[],deductions:[],receipts:[]}};
        const keys={favorites:'favoriteCocktails',customs:'customRecipes',shopping:'shoppingList',selected:'selectedIngredients',preferences:'personalPreferences',history:'preparationHistory',inventory:'barInventory'};
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
            if(personalDataVersion!==1 || inventoryDataVersion!==1) {
                const capability=await accountRequest('/api/account/backup');
                if(!capability.success)return capability;
                personalDataVersion=capability.personalDataVersion||0;
                inventoryDataVersion=capability.inventoryDataVersion||0;
                if(personalDataVersion!==1 || inventoryDataVersion!==1)return {success:false,reason:getCurrentLang()==='en'?'Backup server is updating. Your local data is safe.':'Yedek sunucusu güncelleniyor. Yerel verilerin korunuyor.'};
            }
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
        personalDataVersion=result.personalDataVersion||0;
        inventoryDataVersion=result.inventoryDataVersion||0;
        if(personalDataVersion!==1 || inventoryDataVersion!==1)return {success:false,reason:getCurrentLang()==='en'?'Backup server is updating. Your local data is safe.':'Yedek sunucusu güncelleniyor. Yerel verilerin korunuyor.'};
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
        sessionToken=result.token;googleCredential=response.credential;rememberRevision(null);
        try {root.sessionStorage.setItem(SESSION_KEY,sessionToken);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        const googleUser=saveUser({...result.user,isReserve:false,createdAt:Date.now()});
        try {
            const owner=root.localStorage.getItem('barcepte_data_owner');
            if(owner && owner!==googleUser.uid)applyCloudData({favorites:[],customs:[],shopping:[],selected:[]},googleUser);
        } catch {showAlert(getCurrentLang()==='en'?'Could not switch local account data.':'Yerel hesap verileri değiştirilemedi.');return;}
        applyServerSubscription(result.subscription);
        // A key redeemed on this device before sign-in: the server may link it to this account.
        if(!accountSubscription && root.BarReserve && typeof root.BarReserve.restoreCachedLicense==='function')root.BarReserve.restoreCachedLicense().catch(()=>{});
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
        restoreLocalAccountBackup(demoUser.uid);
        closeAuthModal();
        showAlert(getCurrentLang() === 'en'
            ? 'Guest Bartender mode: data stays on this device.'
            : 'Misafir modu: veriler bu cihazda tutulur.');
    }

    function clearSession() {
        personalDataVersion=0;
        inventoryDataVersion=0;
        loginAttempt++;
        const token=sessionToken;sessionToken='';cloudRevision=null;
        accountSubscription=null;googleCredential=null;
        try {root.sessionStorage.removeItem(SESSION_KEY);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        if(token && root.fetch)root.fetch(API_ORIGIN+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});
        if(getCurrentUser()?.provider==='google' && root.BarReserve?.deactivateReserve)root.BarReserve.deactivateReserve(false);
    }
    function logout() {
        const user = getCurrentUser();
        // Save the account's lists first; if that fails, stay signed in rather than lose data.
        if (user) {
            try {
                backupAndClearLocalData(user);
            } catch {
                showAlert(getCurrentLang() === 'en' ? 'Could not save your data on this device; you are still signed in.' : 'Veriler bu cihazda yedeklenemedi; oturumun açık kaldı.');
                return;
            }
        }
        clearSession();
        // Signing out ends any Reserve verified in this session, including pending verifications.
        if (root.BarReserve && typeof root.BarReserve.deactivateReserve === 'function') root.BarReserve.deactivateReserve(false);
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
            const reserve = reserveInfo();
            const isMember = Boolean(reserve && reserve.active);
            const firstName = user.name.split(' ')[0] || (getCurrentLang() === 'en' ? 'My Account' : 'Hesabım');
            if (authBtnLabel) authBtnLabel.textContent = firstName;
            if (authBtnIcon) {
                if (isMember) {
                    authBtnIcon.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/></svg>';
                } else if (user.picture) {
                    authBtnIcon.innerHTML = `<img src="${user.picture}" alt="" class="w-4 h-4 rounded-full object-cover">`;
                } else {
                    authBtnIcon.innerHTML = '<i class="bci bci-martini" aria-hidden="true"></i>';
                }
            }
            authBtn.className = isMember
                ?"pill-btn px-2.5 py-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/10 text-[11px] font-black text-amber-300 flex items-center gap-1.5 hover:border-amber-400 shrink-0 whitespace-nowrap"
                : "pill-btn px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 hover:bg-emerald-500/20 shrink-0 whitespace-nowrap";
        } else {
            if (authBtnLabel) authBtnLabel.textContent = getCurrentLang() === 'en' ? 'Sign In' : 'Giriş Yap';
            if (authBtnIcon) authBtnIcon.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
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

            const reserve = reserveInfo();
            const isMember = Boolean(reserve && reserve.active);
            if (tierBadgeEl) {
                if (isMember) {
                    const planText = reserve.plan === 'monthly'
                        ? (getCurrentLang() === 'en' ? 'MONTHLY' : 'AYLIK')
                        : (reserve.plan === 'lifetime'
                            ? (getCurrentLang() === 'en' ? 'LIFETIME' : 'ÖMÜR BOYU')
                            : (getCurrentLang() === 'en' ? 'ANNUAL' : 'YILLIK'));
                    tierBadgeEl.textContent = (getCurrentLang() === 'en' ? 'RESERVE VIP MEMBER (' : 'RESERVE VIP ÜYE (') + planText + ')';
                    tierBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950';
                } else {
                    tierBadgeEl.textContent = getCurrentLang() === 'en' ? 'BARTENDER CLUB MEMBER (FREE)' : 'BARMEN KULÜBÜ ÜYESİ (ÜCRETSİZ)';
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
                licenseBindBox.classList.toggle('hidden', isMember);
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
                            alert(getCurrentLang() === 'en' ? 'Your license key was successfully linked to your account!' : 'Lisans anahtarınız hesabınıza başarıyla bağlandı ve tek kullanımlık olarak mühürlendi!');
                            if (input) input.value = '';
                            renderAuthModalState();
                            updateAuthUI();
                        } else {
                            alert(result.reason || (getCurrentLang() === 'en' ? 'Activation could not be completed.' : 'Aktivasyon gerçekleştirilemedi.'));
                        }
                    } else {
                        // Without the Reserve module there is no server verification, so nothing is activated.
                        alert(getCurrentLang() === 'en' ? 'Activation could not be completed.' : 'Aktivasyon gerçekleştirilemedi.');
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
        getIdToken,
        getAccountSubscription,
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
