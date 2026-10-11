document.getElementById('hero-build-bar').addEventListener('click', () => {
    document.getElementById('discovery-controls').scrollIntoView({behavior: 'smooth', block: 'start'});
    document.getElementById('ing-search').focus({preventScroll: true});
});
document.getElementById('hero-surprise').addEventListener('click', () => pickRandomCocktail());
document.querySelectorAll('.main-navigation > button').forEach(button => {
    if (button.id === 'tab-alkol') button.setAttribute('aria-current', 'page');
});
