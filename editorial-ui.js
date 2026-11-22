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
// Phones: taste and mood filters fold behind one "Filtrele (n)" button so results lead the page.
const filterToggle = document.getElementById('btn-filter-toggle');
const discovery = document.getElementById('discovery-controls');
function activeFilterCount() {
    if (!discovery) return 0;
    const taste = discovery.querySelector('.taste-btn.bg-amber-500:not([data-taste="all"])') ? 1 : 0;
    const vibe = discovery.querySelector('.vibe-btn.bg-amber-500\\/20:not([data-vibe="all"])') ? 1 : 0;
    return taste + vibe;
}
function updateFilterCount() {
    const n = activeFilterCount();
    const out = filterToggle?.querySelector('.filter-count');
    if (out) out.textContent = n ? `(${n})` : '';
    filterToggle?.classList.toggle('has-active', n > 0);
}
filterToggle?.addEventListener('click', () => {
    const open = discovery.classList.toggle('filters-open');
    filterToggle.setAttribute('aria-expanded', String(open));
});
discovery?.addEventListener('click', () => setTimeout(updateFilterCount, 0));
updateFilterCount();

// Picking a section, pressing Escape or tapping outside folds the secondary list back.
function closeMoreTabs() {
    const nav = moreTabsBtn?.closest('.main-navigation');
    if (!nav?.classList.contains('show-more')) return;
    nav.classList.remove('show-more');
    moreTabsBtn.setAttribute('aria-expanded', 'false');
    moreTabsBtn.textContent = moreTabsBtn.textContent.replace(/[▾▴]$/, '▾');
}
document.querySelectorAll('.main-navigation > [data-nav-secondary]').forEach(el => el.addEventListener('click', closeMoreTabs));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMoreTabs(); });
document.addEventListener('click', e => { if (moreTabsBtn && !moreTabsBtn.closest('.main-navigation').contains(e.target)) closeMoreTabs(); });

document.getElementById('home-daily-open')?.addEventListener('click', () => {
    const drink = typeof getDailyCocktail === 'function' && getDailyCocktail();
    if (drink) openCocktail(drink);
});

// The tool ribbon is folded behind one button (CSS hides it until opened); on desktop it opens as a popover.
const toolsToggle = document.getElementById('btn-tools-toggle');
function setToolsOpen(open) {
    document.querySelector('.app-header')?.classList.toggle('tools-open', open);
    toolsToggle?.setAttribute('aria-expanded', String(open));
}
toolsToggle?.addEventListener('click', event => {
    event.stopPropagation();
    setToolsOpen(toolsToggle.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('click', event => {
    if (toolsToggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.topbar-tools-ribbon')) setToolsOpen(false);
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toolsToggle?.getAttribute('aria-expanded') === 'true') { setToolsOpen(false); toolsToggle.focus(); }
});

// Light/dark switch; theme.js applies the saved choice on the next load before paint.
const themeToggle = document.getElementById('btn-theme-toggle');
function syncThemeToggle() {
    const light = document.documentElement.dataset.theme === 'light';
    const en = typeof currentLang !== 'undefined' && currentLang === 'en';
    themeToggle?.setAttribute('aria-pressed', String(light));
    const label = document.getElementById('theme-toggle-label');
    if (label) label.textContent = light ? (en ? 'Dark theme' : 'Koyu tema') : (en ? 'Light theme' : 'Açık tema');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#e7f0e8' : '#092328');
}
themeToggle?.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('barcepte_theme', light ? 'light' : 'dark'); } catch {}
    if (typeof track === 'function') track('action', light ? 'theme_light' : 'theme_dark');
    syncThemeToggle();
});
document.getElementById('btn-lang-toggle')?.addEventListener('click', () => setTimeout(syncThemeToggle));
syncThemeToggle();
