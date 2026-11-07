// Editorial layout UI handlers
const heroBuildBarBtn = document.getElementById('hero-build-bar');
if (heroBuildBarBtn) {
    heroBuildBarBtn.addEventListener('click', () => {
        if (window.BarPersonalUI?.start) {
            if (typeof switchTab === 'function') switchTab('bar');
            window.BarPersonalUI.start();
            return;
        }
        if (typeof switchTab === 'function') switchTab('ingredients');
        const target = document.getElementById('ingredients-section');
        if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
        const searchInput = document.getElementById('ing-search');
        if (searchInput) searchInput.focus({preventScroll: true});
    });
}

const heroSurpriseBtn = document.getElementById('hero-surprise');
if (heroSurpriseBtn) {
    heroSurpriseBtn.addEventListener('click', () => {
        if (typeof pickRandomCocktail === 'function') pickRandomCocktail();
    });
}

document.querySelectorAll('.main-navigation > button').forEach(button => {
    if (button.id === 'tab-home') button.setAttribute('aria-current', 'page');
});

document.querySelectorAll('#home-shortcuts [data-shortcut]').forEach(tile => {
    tile.addEventListener('click', () => {
        if (typeof switchTab === 'function') switchTab(tile.dataset.shortcut);
    });
});

document.getElementById('btn-ingredients-to-recipes')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('alkol');
});

document.getElementById('tab-home')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('home');
});
document.getElementById('tab-ingredients')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('ingredients');
});

// "More" reveals the secondary tabs; the active tab stays visible either way (CSS).
const moreTabsBtn = document.getElementById('tab-more');
moreTabsBtn?.addEventListener('click', () => {
    const nav = moreTabsBtn.closest('.main-navigation');
    const open = nav.classList.toggle('show-more');
    moreTabsBtn.setAttribute('aria-expanded', String(open));
    moreTabsBtn.textContent = moreTabsBtn.textContent.replace(/[▾▴]$/, open ? '▴' : '▾');
});

document.getElementById('home-daily-open')?.addEventListener('click', () => {
    const drink = typeof getDailyCocktail === 'function' && getDailyCocktail();
    if (drink) openCocktail(drink);
});

// Phones: the tool ribbon is folded behind one button (CSS hides it until opened).
const toolsToggle = document.getElementById('btn-tools-toggle');
toolsToggle?.addEventListener('click', () => {
    const open = document.querySelector('.app-header').classList.toggle('tools-open');
    toolsToggle.setAttribute('aria-expanded', String(open));
});

// Light/dark switch; theme.js applies the saved choice on the next load before paint.
const themeToggle = document.getElementById('btn-theme-toggle');
function syncThemeToggle() {
    const light = document.documentElement.dataset.theme === 'light';
    const en = typeof currentLang !== 'undefined' && currentLang === 'en';
    themeToggle?.setAttribute('aria-pressed', String(light));
    const label = document.getElementById('theme-toggle-label');
    if (label) label.textContent = light ? (en ? 'Dark theme' : 'Koyu tema') : (en ? 'Light theme' : 'Açık tema');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f6f3ee' : '#050505');
}
themeToggle?.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('barcepte_theme', light ? 'light' : 'dark'); } catch {}
    syncThemeToggle();
});
document.getElementById('btn-lang-toggle')?.addEventListener('click', () => setTimeout(syncThemeToggle));
syncThemeToggle();
