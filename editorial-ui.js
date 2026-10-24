// Editorial layout UI handlers
const heroBuildBarBtn = document.getElementById('hero-build-bar');
if (heroBuildBarBtn) {
    heroBuildBarBtn.addEventListener('click', () => {
        if (window.BarPersonalUI?.start) {
            if (typeof switchTab === 'function') switchTab('bar');
            window.BarPersonalUI.start();
            return;
        }
        if (typeof switchTab === 'function') switchTab('alkol');
        const target = document.getElementById('discovery-controls') || document.getElementById('ingredients-section');
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
    if (button.id === 'tab-alkol') button.setAttribute('aria-current', 'page');
});
