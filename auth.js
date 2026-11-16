/**
 * Bar Cepte — Üyelik, Google Sign-In & Bulut Senkronizasyonu Modülü (auth.js)
 * 
 * Özellikler:
 * 1. Google OAuth 2.0 (Google Identity Services) ile tek tıkla giriş.
 * 2. Cihazlar arası otomatik Bulut Senkronizasyonu (Favoriler, Dolap, Özel Kokteyller).
 * 3. Lisans anahtarları yalnızca lisans sunucusunda mühürlenir; yerel kayıtlar hiçbir yetki vermez.
 * 4. Google hesabına bağlı Reserve, sunucunun döndürdüğü abonelikle her cihazda tanınır.
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
    const CLOUD_CONSENT_KEY = 'barcepte_cloud_backup_consent';
    const LOCAL_BACKUP_PREFIX = 'barcepte_cloud_data_';

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
            // Reserve fields are derived from the server-verified entitlement in getCurrentUser().
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
        if (currentUser) {
            const info = root.BarReserve && typeof root.BarReserve.getSubscriptionInfo === 'function'
                ? root.BarReserve.getSubscriptionInfo() : null;
            const active = Boolean(info && info.active);
            currentUser.isReserve = active;
            currentUser.plan = active ? info.plan : null;
            currentUser.reserveKey = active ? info.key : '';
            currentUser.reserveExpiresAt = active ? info.expiresAt : 0;
        }
        return currentUser;
    }

    function isLoggedIn() {
        return Boolean(getCurrentUser());
    }

    const DEVICE_ID_KEY = 'barcepte_device_id';

    // Existing IDs are kept verbatim: device-bound licenses on the server are tied to that exact string.
    function getDeviceId() {
        try {
            let id = root.localStorage.getItem(DEVICE_ID_KEY);
            if (!id) {
                const bytes = new Uint8Array(32);
                root.crypto.getRandomValues(bytes);
                id = 'dev_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
                root.localStorage.setItem(DEVICE_ID_KEY, id);
            }
            return id;
        } catch {
            return 'dev_unknown';
        }
    }

    // The raw Google credential is kept in memory only; the server, not parseJwt, verifies identity.
    function getIdToken() {
        const user = getCurrentUser();
        const profile = googleCredential && parseJwt(googleCredential);
        if (!user || user.provider !== 'google' || !profile || 'google_' + profile.sub !== user.uid ||
            !Number.isFinite(profile.exp) || profile.exp * 1000 <= Date.now()) return null;
        return googleCredential;
    }

    // --- Lisans anahtarı (yalnızca biçim kontrolü; sahiplik kararını sunucu verir) ---
    // Legacy read-only: older versions kept a local claim registry. It never grants or denies anything.
    function getClaimedLicenses() {
        try {
            const raw = root.localStorage.getItem(USED_KEYS_STORAGE);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    function canUseLicenseKey(rawKey) {
        const allowed = Boolean(root.BarReserve && root.BarReserve.validateLicenseKey(rawKey));
        return { allowed, reason: allowed ? 'Sunucu doğrulaması gerekli.' : 'Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.' };
    }

    // Compatibility only: local registries never grant entitlement any more.
    function claimLicenseKey() { return false; }
    function markLicenseClaimedLocally() { return false; }

    // --- Bulut Senkronizasyonu (Cloud Sync) ---
    function collectCurrentLocalData() {
        const sec = root.BarSecurity;
        const list = key => { try { const v = JSON.parse(root.localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
        if (!sec) return { favorites: list('favoriteCocktails'), customs: list('customRecipes'), shopping: list('shoppingList'), selected: list('selectedIngredients') };
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
        } catch {
            return { favorites: [], customs: [], shopping: [], selected: [] };
        }
    }

    const DATA_KEYS = { favorites: 'favoriteCocktails', customs: 'customRecipes', shopping: 'shoppingList', selected: 'selectedIngredients',
        preferences: 'personalPreferences', history: 'preparationHistory', inventory: 'barInventory' };
    const EMPTY_DATA = () => ({ favorites: [], customs: [], shopping: [], selected: [] });
    function isEmptyData(data) {
        if (!data) return true;
        const items = data.inventory && Array.isArray(data.inventory.items) ? data.inventory.items.length : 0;
        return ['favorites', 'customs', 'shopping', 'selected', 'history'].every(field => !Array.isArray(data[field]) || !data[field].length) && !items;
    }
    function uniqueBy(list, keyOf) {
        const seen = new Set();
        return list.filter(item => { const key = keyOf(item); if (seen.has(key)) return false; seen.add(key); return true; });
    }
    // Union of two copies of the same account's data; nothing is dropped except duplicates.
    // `primary` wins where a single value has to be chosen (preferences, a stock quantity).
    // Notebook rows are de-duplicated by id and by (recipe, time); stock receipts by id.
    function mergeAccountData(primary, secondary) {
        const a = primary || {}, b = secondary || {};
        const arr = value => Array.isArray(value) ? value : [];
        const strings = (x, y, fold) => uniqueBy([...arr(x), ...arr(y)].filter(item => typeof item === 'string' && item.trim()),
            item => fold ? item.trim().toLocaleLowerCase('tr-TR') : item.trim()).slice(0, 1000);
        const merged = {
            favorites: strings(a.favorites, b.favorites),
            customs: uniqueBy([...arr(a.customs), ...arr(b.customs)].filter(r => r && typeof r.idDrink === 'string'), r => r.idDrink).slice(0, 300),
            shopping: strings(a.shopping, b.shopping, true),
            selected: strings(a.selected, b.selected)
        };
        const history = uniqueBy(uniqueBy([...arr(a.history), ...arr(b.history)].filter(row => row && typeof row === 'object'), row => row.id),
            row => `${row.drinkId}|${row.createdAt}`).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)).slice(0, 100);
        if (history.length || a.history !== undefined || b.history !== undefined) merged.history = history;
        const prefs = [a.preferences, b.preferences].filter(p => p && typeof p === 'object' && !Array.isArray(p));
        if (prefs.length) merged.preferences = { ...prefs[prefs.length - 1], ...prefs[0], onboardingDone: prefs.some(p => p.onboardingDone === true) };
        const stocks = [a.inventory, b.inventory].filter(v => v && typeof v === 'object' && Array.isArray(v.items));
        if (stocks.length) {
            const receipts = uniqueBy(stocks.flatMap(v => arr(v.receipts)), row => row && row.id).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)).slice(0, 100);
            const candidate = {
                items: uniqueBy(stocks.flatMap(v => v.items).filter(row => row && typeof row.ingredient === 'string'), row => row.ingredient.trim().toLowerCase()).slice(0, 1000),
                deductions: uniqueBy([...receipts.map(row => row.id), ...stocks.flatMap(v => arr(v.deductions))], id => id).slice(0, 100),
                receipts
            };
            try { merged.inventory = root.BarSecurity ? root.BarSecurity.inventory(candidate) : candidate; } catch { merged.inventory = stocks[0]; }
        }
        if (!root.BarSecurity) return merged;
        try { return root.BarSecurity.backup(merged); } catch {}
        try { return root.BarSecurity.backup(a); } catch {}
        return root.BarSecurity.backup(b);
    }

    // On sign-out the account's data moves to an on-device copy so the next person on this device
    // does not see it; signing back in to the same account (Google or local) merges it back.
    function stashAccountData(user) {
        if (!user || !user.uid) return;
        const current = collectCurrentLocalData();
        let previous = null;
        try { previous = JSON.parse(root.localStorage.getItem(LOCAL_BACKUP_PREFIX + user.uid) || 'null'); } catch {}
        // An older copy that was never restored is merged, not overwritten.
        const data = previous && previous.data ? mergeAccountData(current, previous.data) : current;
        root.localStorage.setItem(LOCAL_BACKUP_PREFIX + user.uid, JSON.stringify({ updatedAt: Date.now(), data }));
        for (const key of ['favoriteCocktails', 'customRecipes', 'shoppingList', 'selectedIngredients']) root.localStorage.setItem(key, '[]');
        // The personal notebook and stock are personal too; preferences keep only "onboarding done".
        const prefs = current.preferences && typeof current.preferences === 'object' ? current.preferences : {};
        try {
            root.localStorage.setItem('personalPreferences', JSON.stringify({ alcohol: 'all', tastes: [], onboardingDone: prefs.onboardingDone === true }));
            root.localStorage.removeItem('preparationHistory');
            root.localStorage.removeItem('barInventory');
        } catch {}
    }
    function readStash(uid) {
        try {
            const stash = JSON.parse(root.localStorage.getItem(LOCAL_BACKUP_PREFIX + uid) || 'null');
            return stash && stash.data && typeof stash.data === 'object' ? stash.data : null;
        } catch { return null; }
    }
    // Merges the on-device copy of this account into the current lists and removes the copy only
    // after the merged data is stored. Never empties a list.
    function restoreStashedData(uid) {
        const stash = readStash(uid);
        if (!stash) return false;
        try {
            const merged = mergeAccountData(collectCurrentLocalData(), stash);
            writeLocalData(merged, uid);
            root.localStorage.removeItem(LOCAL_BACKUP_PREFIX + uid);
            return true;
        } catch { return false; }
    }
    // Writes validated account data to local storage (all or nothing) and redraws the app from it.
    function writeLocalData(valid, uid) {
        const previous = {};
        for (const key of Object.values(DATA_KEYS)) previous[key] = root.localStorage.getItem(key);
        try {
            for (const [field, key] of Object.entries(DATA_KEYS)) if (valid[field] !== undefined) root.localStorage.setItem(key, JSON.stringify(valid[field]));
            if (uid) root.localStorage.setItem('barcepte_data_owner', uid);
        } catch (error) {
            for (const [key, value] of Object.entries(previous)) { try { if (value === null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, value); } catch {} }
            throw error;
        }
        reloadAppState();
    }
    // game.js keeps the lists in memory; after storage changes underneath it, it must re-read them,
    // otherwise the old account's lists stay visible and the next edit writes them back.
    function reloadAppState() {
        if (typeof root.applyCloudBackup !== 'function') return;
        try { root.applyCloudBackup(collectCurrentLocalData()); } catch {}
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
    // The account server's answer is authoritative for an account-bound subscription. "No subscription
    // for this account" is not proof that a device-bound key is invalid, so that case re-checks the key.
    // Subscriptions from the account server belong to the Google account, not to this device.
    function applyServerSubscription(subscription) {
        const user=getCurrentUser();if(!user)return;
        if(root.BarReserve) {
            if(subscription && root.BarReserve.acceptServerSubscription)root.BarReserve.acceptServerSubscription(subscription,{binding:'account'});
            else if(!subscription && root.BarReserve.revalidate)root.BarReserve.revalidate({force:true}).catch(()=>{});
        }
        saveUser(getCurrentUser());
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
    async function syncToCloud(options={}) {
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
            // An empty device must not silently replace an existing backup (e.g. right after sign-out/in).
            if(cloudRevision>0 && isEmptyData(data) && !options.allowEmpty)return {success:false,emptyRefused:true,reason:getCurrentLang()==='en'?'Your lists on this device are empty, so the cloud backup was not replaced.':'Bu cihazdaki listelerin boş; bulut yedeğinin üzerine yazılmadı.'};
            const result=await accountRequest('/api/account/backup',{method:'PUT',body:JSON.stringify({data,revision:cloudRevision})});
            if(result.success){rememberRevision(result.revision);user.lastSync=result.updatedAt;saveUser(user);root.localStorage.setItem('barcepte_data_owner',user.uid);}
            return result;
        }catch {return {success:false,reason:'Yerel veriler okunamadı; yedek gönderilmedi.'};}
    }
    async function syncFromCloud(options={}) {
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
            const cloud=root.BarSecurity.backup(result.backup.data);
            // On sign-in the cloud copy is merged with what is on this device (including the copy
            // kept at sign-out), so neither side's lists are silently lost.
            const valid=options.merge?mergeAccountData(cloud,collectCurrentLocalData()):cloud;
            applyCloudData(valid,user);rememberRevision(result.backup.revision);
            if(options.merge && JSON.stringify(valid)!==JSON.stringify(cloud))return {success:true,data:valid,merged:true};
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
        sessionToken=result.token;rememberRevision(null);googleCredential=response.credential;
        try {root.sessionStorage.setItem(SESSION_KEY,sessionToken);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        const googleUser=saveUser({...result.user,isReserve:false,createdAt:Date.now()});
        try {
            const owner=root.localStorage.getItem('barcepte_data_owner');
            if(owner && owner!==googleUser.uid) {
                // Another account's lists are still here (no sign-out): keep them for that account.
                try {stashAccountData({uid:owner});} catch {}
                applyCloudData(EMPTY_DATA(),googleUser);
            }
        } catch {showAlert(getCurrentLang()==='en'?'Could not switch local account data.':'Yerel hesap verileri değiştirilemedi.');return;}
        // Lists kept on this device at sign-out come back first; the cloud copy is merged in next.
        restoreStashedData(googleUser.uid);
        applyServerSubscription(result.subscription);
        const restore=await syncFromCloud({merge:true});
        if(attempt!==loginAttempt)return;
        if(restore.notFound) {
            try {
                const owner=root.localStorage.getItem('barcepte_data_owner');
                if(owner && owner!==googleUser.uid)applyCloudData(EMPTY_DATA(),googleUser);
                else root.localStorage.setItem('barcepte_data_owner',googleUser.uid);
            }catch {}
            // The first upload needs explicit consent. There is no backup yet, so nothing can be overwritten.
            if(askCloudConsent())await syncToCloud();
        } else if(restore.merged) {
            // The merged lists are a superset of the cloud copy; upload them only with earlier consent.
            let consent=null;try {consent=root.localStorage.getItem(CLOUD_CONSENT_KEY);}catch {}
            if(consent==='granted')await syncToCloud();
        }
        closeAuthModal();
        showAlert(getCurrentLang()==='en'?`Welcome, ${googleUser.name}!`: `Hoş geldin, ${googleUser.name}!`);
    }
    function askCloudConsent() {
        let stored=null;
        try {stored=root.localStorage.getItem(CLOUD_CONSENT_KEY);}catch {}
        if(stored==='granted')return true;
        if(typeof root.confirm!=='function')return stored!=='denied'; // no dialog available (tests/automation)
        const granted=root.confirm(getCurrentLang()==='en'
            ? 'Back up your favourites, custom recipes, shopping list, bar stock and tasting notes to your Google-linked Bar Cepte account? They are stored on our server (Render/Neon) so other devices can restore them. You can delete the backup at any time.'
            : 'Favorilerin, özel tariflerin, alışveriş listen, bar stoğun ve tadım notların Google hesabına bağlı Bar Cepte yedeğine yüklensin mi? Veriler diğer cihazlarda geri yüklenebilmesi için sunucumuzda (Render/Neon) saklanır. Yedeği istediğin zaman silebilirsin.');
        try {root.localStorage.setItem(CLOUD_CONSENT_KEY,granted?'granted':'denied');}catch {}
        return granted;
    }
    // Deletes the server-side backup and all sessions of the signed-in Google account, then signs out locally.
    async function deleteCloudAccount() {
        const user=getCurrentUser();
        if(!sessionToken || !user || user.provider!=='google')return {success:false,reason:getCurrentLang()==='en'?'Sign in with Google first.':'Önce Google ile giriş yapınız.'};
        const result=await accountRequest('/api/account',{method:'DELETE'});
        if(!result.success)return result;
        try {root.localStorage.removeItem(CLOUD_CONSENT_KEY);root.localStorage.removeItem('barcepte_data_owner');}catch {}
        sessionToken='';cloudRevision=null;
        try {root.sessionStorage.removeItem(SESSION_KEY);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        logout();
        return {success:true};
    }
    async function restoreSession() {
        if(!sessionToken)return;
        const result=await accountRequest('/api/account');
        if(result.success){saveUser({...result.user,lastSync:getCurrentUser()?.lastSync||0});applyServerSubscription(result.subscription);}
    }

    // --- Demo / Misafir Girişi (Test & Hızlı Kullanım) ---
    function loginAsDemoUser() {
        const previous = getCurrentUser();
        if (previous && previous.uid !== 'demo_user_barmen') { try { stashAccountData(previous); } catch {} }
        clearSession();
        if (previous && previous.provider === 'google') { currentUser = null; try { root.localStorage.removeItem(AUTH_USER_KEY); } catch {} releaseAccountReserve(); }
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
        restoreStashedData(demoUser.uid);
        reloadAppState();
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
        try {root.sessionStorage.removeItem(SESSION_KEY);root.sessionStorage.removeItem(REVISION_KEY);}catch {}
        googleCredential=null;
        if(token && root.fetch)root.fetch(API_ORIGIN+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});
    }
    // Only Reserve that belongs to the Google account leaves with it; a key bound to this device
    // (activated without an account, or by an older version) stays. Unknown bindings are re-checked
    // with the server as this device once signed out.
    function releaseAccountReserve() {
        if(root.BarReserve?.releaseAccountEntitlement)root.BarReserve.releaseAccountEntitlement();
        else if(root.BarReserve?.deactivateReserve)root.BarReserve.deactivateReserve(false);
    }
    function logout() {
        try {stashAccountData(getCurrentUser());} catch {}
        clearSession();
        currentUser = null;
        try {
            root.localStorage.removeItem(AUTH_USER_KEY);
        } catch {}
        releaseAccountReserve();
        reloadAppState();
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
                    authBtnIcon.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/></svg>';
                } else if (user.picture) {
                    authBtnIcon.innerHTML = `<img src="${user.picture}" alt="" class="w-4 h-4 rounded-full object-cover">`;
                } else {
                    authBtnIcon.innerHTML = '<i class="bci bci-martini" aria-hidden="true"></i>';
                }
            }
            authBtn.className = user.isReserve
                ? "pill-btn px-2.5 py-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/10 text-[11px] font-black text-amber-300 flex items-center gap-1.5 hover:border-amber-400 shrink-0 whitespace-nowrap"
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

            if (tierBadgeEl) {
                if (user.isReserve) {
                    const planText = user.plan === 'monthly'
                        ? (getCurrentLang() === 'en' ? 'MONTHLY' : 'AYLIK')
                        : (user.plan === 'lifetime'
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

            const deleteSection=document.getElementById('auth-delete-section');
            if(deleteSection){
                deleteSection.classList.toggle('hidden',!cloudEnabled);
                const isEn=getCurrentLang()==='en';
                const desc=document.getElementById('auth-delete-desc');
                if(desc)desc.textContent=isEn?'Your cloud backup and sessions are permanently deleted from the server. Data on this device and any Reserve code you bought are kept.':'Bulut yedeğin ve oturumların sunucudan kalıcı olarak silinir. Bu cihazdaki verilerin ve satın aldığın Reserve kodu korunur.';
                const deleteBtn=document.getElementById('btn-auth-delete-account');
                if(deleteBtn)deleteBtn.textContent=isEn?'Delete my account and cloud backup':'Hesabımı ve bulut yedeğimi sil';
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

        const deleteAccountBtn = document.getElementById('btn-auth-delete-account');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', async () => {
                const isEn = getCurrentLang() === 'en';
                const status = document.getElementById('auth-delete-status');
                if (!confirm(isEn
                    ? 'Permanently delete your account, cloud backup and sessions from the server? This cannot be undone. Data on this device and your Reserve code are kept.'
                    : 'Hesabın, bulut yedeğin ve oturumların sunucudan kalıcı olarak silinsin mi? Bu işlem geri alınamaz. Bu cihazdaki verilerin ve Reserve kodun korunur.')) return;
                deleteAccountBtn.disabled = true;
                if (status) status.textContent = isEn ? 'Deleting…' : 'Siliniyor…';
                let result;
                try { result = await deleteCloudAccount(); } catch { result = { success: false, reason: '' }; }
                deleteAccountBtn.disabled = false;
                if (result.success) {
                    if (status) status.textContent = '';
                    showAlert(isEn ? 'Your account and cloud backup were deleted. You are signed out.' : 'Hesabın ve bulut yedeğin silindi. Oturumun kapatıldı.');
                    renderAuthModalState();
                } else if (status) {
                    status.textContent = (isEn ? 'Could not delete: ' : 'Silinemedi: ') + (result.reason || (isEn ? 'try again later.' : 'daha sonra tekrar dene.'));
                }
            });
        }

        const syncNowBtn = document.getElementById('btn-auth-sync-now');
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                syncNowBtn.disabled=true;
                let result = await syncToCloud();
                if (result.emptyRefused && confirm(getCurrentLang() === 'en'
                    ? 'Your lists on this device are empty. Replace the cloud backup with empty lists?'
                    : 'Bu cihazdaki listelerin boş. Bulut yedeği boş listelerle değiştirilsin mi?')) result = await syncToCloud({ allowEmpty: true });
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
                        // No offline fallback: a key is only activated after the license server confirms it.
                        alert(getCurrentLang() === 'en' ? 'Activation is unavailable right now. Please reload and try again.' : 'Aktivasyon şu an kullanılamıyor. Sayfayı yenileyip tekrar deneyiniz.');
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
        deleteCloudAccount,
        canUseLicenseKey,
        claimLicenseKey,
        markLicenseClaimedLocally,
        syncToCloud,
        syncFromCloud,
        mergeAccountData,
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
