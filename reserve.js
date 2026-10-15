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
            title: 'Annual Pass (Best Value)',
            price: '$14.99',
            period: '/ year ($1.25/mo)',
            badge: '⭐ SAVE 58% — POPULAR',
            subtitle: '365 Days VIP Access',
            desc: 'Only $1.25/mo! 1 full year of uninterrupted ad-free VIP cocktail experience and gold badge.',
            checkoutLabel: 'Secure Checkout via Shopier ($14.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        },
        lifetime: {
            title: 'Lifetime VIP Pass',
            price: '$29.99',
            period: 'one-time',
            badge: 'LIFETIME VIP',
            subtitle: 'Yours Forever',
            desc: 'Pay once, enjoy ad-free forever. Never pay again for future upgrades.',
            checkoutLabel: 'Secure Checkout via Shopier ($29.99)',
            shopierUrl: 'https://www.shopier.com/Anawin'
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
            title: 'Annual Pass (Best Value)',
            price: '€13.99',
            period: '/ year (€1.16/mo)',
            badge: '⭐ SAVE 60% — POPULAR',
            subtitle: '365 Days VIP Access',
            desc: 'Only €1.16/mo! 1 full year of uninterrupted ad-free VIP cocktail experience and gold badge.',
            checkoutLabel: 'Secure Checkout via Shopier (€13.99)',
            shopierUrl: 'https://www.shopier.com/Anawin/51735632'
        },
        lifetime: {
            title: 'Lifetime VIP Pass',
            price: '€27.99',
            period: 'one-time',
            badge: 'LIFETIME VIP',
            subtitle: 'Yours Forever',
            desc: 'Pay once, enjoy ad-free forever. Never pay again for future upgrades.',
            checkoutLabel: 'Secure Checkout via Shopier (€27.99)',
            shopierUrl: 'https://www.shopier.com/Anawin'
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
        const isEn = getCurrentLang() === 'en';
        if (!key || typeof key !== 'string') {
            return { success: false, reason: isEn ? 'Please enter an activation key.' : 'Lütfen bir aktivasyon kodu giriniz.' };
        }
        const cleanKey = key.trim().toUpperCase();

        // 1. Format ve sağlama toplamı kontrolü
        if (!validateLicenseKey(cleanKey)) {
            return { success: false, reason: isEn ? '❌ Invalid activation key. Please check again.' : '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.' };
        }

        // 4. Merkezi Sunucu (Render Webhook) Doğrulaması
        const user = root.BarAuth && typeof root.BarAuth.getCurrentUser === 'function' ? root.BarAuth.getCurrentUser() : null;
        const deviceId = (root.BarAuth && typeof root.BarAuth.getDeviceId === 'function') ? root.BarAuth.getDeviceId() : getLocalDeviceId();
        const payload = {
            key: cleanKey,
            uid: user && root.BarAuth.getSessionToken && root.BarAuth.getSessionToken() ? user.uid : null,
            email: user ? user.email : '',
            deviceId: deviceId
        };

        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), 15000) : null;
        try {
            const resp = await fetch('https://bar-cepte-webhook.onrender.com/api/claim-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(root.BarAuth && root.BarAuth.getSessionToken && root.BarAuth.getSessionToken()?{Authorization:'Bearer '+root.BarAuth.getSessionToken()}: {}) },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                // Sunucu reddetti (başkası tarafından kullanılmış veya süresi dolmuş)
                if (resp.status === 409 && root.BarAuth && typeof root.BarAuth.markLicenseClaimedLocally === 'function') {
                    root.BarAuth.markLicenseClaimedLocally(cleanKey, data.claimedBy || 'external_user');
                }
                return {
                    success: false,
                    reason: data.reason || (isEn
                        ? '❌ This license key was already claimed by another user or device! Licenses are single-use.'
                        : '❌ Bu lisans anahtarı daha önce başka bir kullanıcı/cihaz tarafından kullanılmış! Lisanslar tek kullanımlıktır.')
                };
            }

            // Sunucu onayladı! Lisansı bu cihaza kaydet
            const plan = data.plan;
            const expiresAt = data.expiresAt;
            if (!['monthly', 'annual', 'lifetime'].includes(plan) ||
                typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) ||
                (plan === 'lifetime' ? expiresAt !== 0 : expiresAt <= Date.now())) {
                throw new Error('Invalid subscription response');
            }

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
            console.warn('Merkezi lisans doğrulaması tamamlanamadı:', err);
            return { success: false, reason: isEn
                ? 'License verification is unavailable. Please connect to the internet and try again.'
                : 'Lisans doğrulaması yapılamadı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.' };
        } finally {
            if (timeout !== null) clearTimeout(timeout);
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

    function deactivateReserve(reload = true) {
        try {
            root.localStorage.removeItem(STORAGE_KEY);
            root.localStorage.removeItem(KEY_STORAGE);
            root.localStorage.removeItem(PLAN_STORAGE);
            root.localStorage.removeItem(EXPIRES_STORAGE);
            if(reload)root.location.reload();
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
        if (planAnnual) planAnnual.innerText = isEn ? '⭐ Annual' : '⭐ Yıllık';
        const planLifetime = document.querySelector('[data-plan="lifetime"]');
        if (planLifetime) planLifetime.innerText = isEn ? 'Lifetime' : 'Ömür Boyu';

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
            reserveClubBadge.innerHTML = isEn ? '<span>👑</span> EXCLUSIVE CURATION CLUB' : '<span>👑</span> ÖZEL SEÇKİ KULÜBÜ';
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
                ? '<strong>Reserve Gold Badge:</strong> Shining status on your account & priority support.'
                : '<strong>Reserve Altın Rozeti:</strong> Hesabında parıldayan statü ve öncelikli destek.';
        }

        // Sekmeler
        const planMonthly = document.querySelector('[data-plan="monthly"]');
        if (planMonthly) planMonthly.innerText = isEn ? 'Monthly' : 'Aylık';
        const planAnnual = document.querySelector('[data-plan="annual"]');
        if (planAnnual) planAnnual.innerText = isEn ? '⭐ Annual' : '⭐ Yıllık';
        const planLifetime = document.querySelector('[data-plan="lifetime"]');
        if (planLifetime) planLifetime.innerText = isEn ? 'Lifetime' : 'Ömür Boyu';

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
                        ? 'Enjoy your evening. You run the bar tonight! 🍸'
                        : 'Keyifli akşamlar dileriz. Tezgâhın kontrolü sizde! 🍸';
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
                        durationEl.textContent = isEn ? '♾️ Lifetime VIP (Unlimited)' : '♾️ Ömür Boyu (Sınırsız)';
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
                                ? `🎉 Congratulations! ${planName} successfully activated.`
                                : `🎉 Tebrikler! ${planName} başarıyla aktif edildi.`;
                            msgEl.className = 'text-xs text-emerald-400 font-bold';
                        }
                        setTimeout(() => {
                            applyReserveUI();
                            selectPlan(currentSelectedPlan);
                        }, 500);
                    } else {
                        if (msgEl) {
                            msgEl.textContent = result.reason || (isEn
                                ? '❌ Invalid activation key. Please check again.'
                                : '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.');
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
        deactivateReserve,
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
