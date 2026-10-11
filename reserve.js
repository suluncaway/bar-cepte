/* Bar Cepte Reserve — Lisans & Üyelik Yönetim Motoru */
(function (root) {
    'use strict';

    const STORAGE_KEY = 'barcepte_reserve_active';
    const KEY_STORAGE = 'barcepte_reserve_license';

    // Sabit kurucu/yönetici anahtarları
    const MASTER_KEYS = new Set([
        'RESERVE-SULUNCA-2026',
        'BARCEPTE-RESERVE-VIP',
        'RESERVE-MASTER-KEY-2026'
    ]);

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

    function isReserveActive() {
        try {
            return root.localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    function activateReserve(key) {
        if (!validateLicenseKey(key)) return false;
        try {
            root.localStorage.setItem(STORAGE_KEY, 'true');
            root.localStorage.setItem(KEY_STORAGE, key.trim().toUpperCase());
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
            root.location.reload();
        } catch {}
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
            activateBtn.addEventListener('click', () => {
                const code = keyInput.value;
                if (!code.trim()) {
                    if (msgEl) {
                        msgEl.textContent = 'Lütfen aktivasyon kodunuzu giriniz.';
                        msgEl.className = 'text-xs text-rose-400 font-semibold';
                    }
                    return;
                }
                const success = activateReserve(code);
                if (success) {
                    if (msgEl) {
                        msgEl.textContent = '🎉 Tebrikler! Bar Cepte Reserve aktif edildi.';
                        msgEl.className = 'text-xs text-emerald-400 font-bold';
                    }
                    setTimeout(() => {
                        applyReserveUI();
                    }, 500);
                } else {
                    if (msgEl) {
                        msgEl.textContent = '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.';
                        msgEl.className = 'text-xs text-rose-400 font-semibold';
                    }
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

    const api = { isReserveActive, activateReserve, deactivateReserve, validateLicenseKey, checksum };
    root.BarReserve = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
