// Static UI handlers. Generated from trusted source markup, never from user input.
document.querySelector('[data-ui="ui-0"]').addEventListener('click', function(event) { openTimerModal(15); });
document.querySelector('[data-ui="ui-1"]').addEventListener('click', function(event) { toggleWakeLock(); });
document.querySelector('[data-ui="ui-2"]').addEventListener('click', function(event) { installPWA(); });
document.querySelector('[data-ui="ui-3"]').addEventListener('click', function(event) { setAlcoholFilter('all'); });
document.querySelector('[data-ui="ui-4"]').addEventListener('click', function(event) { setAlcoholFilter('Alcoholic'); });
document.querySelector('[data-ui="ui-5"]').addEventListener('click', function(event) { setAlcoholFilter('Non_Alcoholic'); });
document.querySelector('[data-ui="ui-6"]').addEventListener('click', function(event) { toggleOnlyFavoritesFilter(); });
document.querySelector('[data-ui="ui-7"]').addEventListener('click', function(event) { setTasteFilter('all', this); });
document.querySelector('[data-ui="ui-8"]').addEventListener('click', function(event) { setTasteFilter('Sert', this); });
document.querySelector('[data-ui="ui-9"]').addEventListener('click', function(event) { setTasteFilter('Tatlı', this); });
document.querySelector('[data-ui="ui-10"]').addEventListener('click', function(event) { setTasteFilter('Ekşi', this); });
document.querySelector('[data-ui="ui-11"]').addEventListener('click', function(event) { setTasteFilter('Ferah', this); });
document.querySelector('[data-ui="ui-12"]').addEventListener('input', function(event) { debouncedRenderIngredients(); });
document.querySelector('[data-ui="ui-13"]').addEventListener('click', function(event) { clearSelection(); });
document.querySelector('[data-ui="ui-14"]').addEventListener('input', function(event) { debouncedFilterCocktails(); });
document.querySelector('[data-ui="ui-15"]').addEventListener('click', function(event) { pickRandomCocktail(); });
document.querySelector('[data-ui="ui-16"]').addEventListener('click', function(event) { switchTab('bar'); });
document.querySelector('[data-ui="ui-17"]').addEventListener('click', function(event) { switchTab('alkol'); });
document.querySelector('[data-ui="ui-18"]').addEventListener('click', function(event) { switchTab('mutfak'); });
document.querySelector('[data-ui="ui-19"]').addEventListener('click', function(event) { switchTab('favorites'); });
document.querySelector('[data-ui="ui-20"]').addEventListener('click', function(event) { switchTab('custom'); });
document.querySelector('[data-ui="ui-21"]').addEventListener('click', function(event) { switchTab('my-recipes'); });
document.querySelector('[data-ui="ui-22"]').addEventListener('click', function(event) { switchTab('shop'); });
document.querySelector('[data-ui="ui-23"]').addEventListener('click', function(event) { switchTab('sync'); });
document.querySelector('[data-ui="ui-24"]').addEventListener('click', function(event) { setKitchenSubCategory('all', this); });
document.querySelector('[data-ui="ui-25"]').addEventListener('click', function(event) { setKitchenSubCategory('meyve', this); });
document.querySelector('[data-ui="ui-26"]').addEventListener('click', function(event) { setKitchenSubCategory('gazli', this); });
document.querySelector('[data-ui="ui-27"]').addEventListener('click', function(event) { setKitchenSubCategory('tatli', this); });
document.querySelector('[data-ui="ui-28"]').addEventListener('click', function(event) { setKitchenSubCategory('baharat', this); });
document.querySelector('[data-ui="ui-29"]').addEventListener('click', function(event) { setKitchenSubCategory('sut-kahve', this); });
document.querySelector('[data-ui="ui-30"]').addEventListener('click', function(event) { scrollIngredients(-160); });
document.querySelector('[data-ui="ui-31"]').addEventListener('click', function(event) { scrollIngredients(160); });
document.querySelector('[data-ui="ui-32"]').addEventListener('click', function(event) { saveCustomRecipe(); });
document.querySelector('[data-ui="ui-33"]').addEventListener('click', function(event) { clearShoppingList(); });
document.querySelector('[data-ui="ui-34"]').addEventListener('click', function(event) { exportUserData(); });
document.querySelector('[data-ui="ui-35"]').addEventListener('click', function(event) { importUserData(); });
document.querySelector('[data-ui="ui-36"]').addEventListener('click', function(event) { forceSyncOnlineDatabase(); });
document.querySelector('[data-ui="ui-37"]').addEventListener('click', function(event) { checkForAppUpdates(true); });
document.querySelector('[data-ui="ui-38"]').addEventListener('click', function(event) { closeTimerModal(); });
document.querySelector('[data-ui="ui-39"]').addEventListener('click', function(event) { setTimerDuration(15); });
document.querySelector('[data-ui="ui-40"]').addEventListener('click', function(event) { setTimerDuration(30); });
document.querySelector('[data-ui="ui-41"]').addEventListener('click', function(event) { setTimerDuration(45); });
document.querySelector('[data-ui="ui-42"]').addEventListener('click', function(event) { toggleTimer(); });
document.querySelector('[data-ui="ui-43"]').addEventListener('click', function(event) { resetTimer(); });
document.querySelector('[data-ui="ui-44"]').addEventListener('click', function(event) { closeUpdateModal(); });
document.querySelector('[data-ui="ui-45"]').addEventListener('click', function(event) { closeUpdateModal(); });

// Direct bindings for language and unit toggles
const langToggleBtn = document.getElementById('btn-lang-toggle');
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', function(event) {
        if (typeof toggleLanguage === 'function') toggleLanguage();
    });
}
const unitToggleBtn = document.getElementById('btn-unit-toggle');
if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', function(event) {
        if (typeof toggleUnit === 'function') toggleUnit();
    });
}

let serviceWorkerAPI = null;
try { serviceWorkerAPI = navigator.serviceWorker; } catch { /* Restricted preview: offline mode unavailable. */ }
// Native Android assets already work offline; a worker cannot intercept WebView asset loads reliably.
if (serviceWorkerAPI && !window.AndroidBridge && window.location.hostname !== 'appassets.androidplatform.net') {
    window.addEventListener('load', () => {
        serviceWorkerAPI.register('./sw.js', {updateViaCache:'none'}).then(reg => {
            reg.update().catch(() => {});
            // PWA arka plan güncellemesi yakalandığında
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && serviceWorkerAPI.controller) {
                            // PWA yeni sürüm yüklendi: mevcut toast diliyle kısa bir yenileme önerisi göster.
                            const en = typeof currentLang !== 'undefined' && currentLang === 'en';
                            const message = en ? 'New version ready' : 'Yeni sürüm hazır';
                            const action = { label: en ? 'Reload' : 'Yenile', onClick: () => window.location.reload() };
                            if (typeof showToast === 'function') showToast(message, 'info', action);
                            else console.log(message);
                        }
                    });
                }
            });
        }).catch(err => console.log('SW Registration failed: ', err));
    });
}
    

// Modal dialogs (timer, update, Reserve, sign-in) are shown/hidden by toggling the "hidden" class
// from several scripts. Watch that class so every dialog moves focus inside when it opens, keeps
// Tab inside while open, and returns focus to the control that opened it when it closes.
(function manageDialogFocus() {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const visible = el => !el.classList.contains('hidden');
    const focusables = dialog => Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
    ['shaker-timer-modal', 'update-modal', 'reserve-modal', 'auth-modal'].forEach(id => {
        const dialog = document.getElementById(id);
        if (!dialog || typeof MutationObserver === 'undefined') return;
        let opener = null;
        let wasOpen = visible(dialog);
        new MutationObserver(() => {
            const open = visible(dialog);
            if (open === wasOpen) return;
            wasOpen = open;
            if (open) {
                opener = document.activeElement instanceof HTMLElement && !dialog.contains(document.activeElement) ? document.activeElement : null;
                requestAnimationFrame(() => {
                    if (dialog.contains(document.activeElement)) return;
                    const first = dialog.querySelector('[autofocus]') || focusables(dialog)[0];
                    (first || dialog).focus?.();
                });
            } else if (opener && document.contains(opener)) {
                const target = opener;
                opener = null;
                requestAnimationFrame(() => target.focus?.());
            }
        }).observe(dialog, { attributes: true, attributeFilter: ['class'] });
        if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab' || !visible(dialog)) return;
            const items = focusables(dialog);
            if (!items.length) { event.preventDefault(); return; }
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
    });
})();
