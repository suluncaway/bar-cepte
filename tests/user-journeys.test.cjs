const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gameJsPath = path.join(__dirname, '..', 'game.js');
const editorialJsPath = path.join(__dirname, '..', 'editorial-ui.js');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');
const editorialJs = fs.readFileSync(editorialJsPath, 'utf8');

test('Journey 1: Editorial hero button safely switches to bar tab and guards DOM lookups', () => {
    assert.ok(editorialJs.includes("if (typeof switchTab === 'function') switchTab('alkol');"), 'switches to alkol tab on hero button click');
    assert.ok(editorialJs.includes("const heroBuildBarBtn = document.getElementById('hero-build-bar');"), 'guards hero-build-bar lookup');
    assert.ok(editorialJs.includes("const heroSurpriseBtn = document.getElementById('hero-surprise');"), 'guards hero-surprise lookup');
});

test('Journey 2: Taste filter works during zero-ingredient exploration mode', () => {
    // Check that isDiscovery requires tasteFilter === 'all'
    assert.ok(
        gameJs.includes("const isDiscovery = selectedIngredients.length === 0 && !cocktailSearch && !onlyFavoritesFilter && currentVibeFilter === 'all' && tasteFilter === 'all';"),
        'isDiscovery considers tasteFilter'
    );
    // Check that pool exploration condition includes tasteFilter !== 'all'
    assert.ok(
        gameJs.includes("cocktailSearch || onlyFavoritesFilter || currentVibeFilter !== 'all' || tasteFilter !== 'all'"),
        'taste filter triggers exploration mode when ingredients are empty'
    );
});

test('Journey 3: openMixMode respects English mode for ingredient names', () => {
    assert.ok(
        gameJs.includes("const displayName = currentLang === 'en' ? ing.trim() : translateIngredientName(ing.trim());"),
        'openMixMode uses English ingredient name when currentLang is en'
    );
});

test('Journey 4: deleteCustomRecipe purges orphaned cocktail favorites and updates UI', () => {
    assert.ok(
        gameJs.includes("if (favoriteCocktails.includes(id)) {"),
        'deleteCustomRecipe checks if custom recipe was favorited'
    );
    assert.ok(
        gameJs.includes("favoriteCocktails = favoriteCocktails.filter(f => f !== id);"),
        'deleteCustomRecipe removes ID from favoriteCocktails'
    );
    assert.ok(
        gameJs.includes("updateFavoritesFilterUI();"),
        'deleteCustomRecipe updates favorites badge and button UI'
    );
});

test('Journey 5: Missing ingredient and substitute card text respects currentLang', () => {
    assert.ok(
        gameJs.includes("const missingDisplayName = currentLang === 'en' ? m : translateIngredientName(m);"),
        'missing ingredient name is localized according to currentLang'
    );
});

test('Journey 6: Instagram story canvas uses English ingredient names when currentLang is en', () => {
    const storyCardSlice = gameJs.slice(gameJs.indexOf('function downloadCocktailStoryCard'), gameJs.indexOf('function filterCocktails'));
    assert.ok(
        storyCardSlice.includes("const displayName = currentLang === 'en' ? ing.trim() : translateIngredientName(ing.trim());"),
        'downloadCocktailStoryCard keeps ingredients in English when in English mode'
    );
});

test('Journey 7: Global Escape key closes modals and importUserData has robust parsing fallback', () => {
    // 7a: Escape key listener
    assert.ok(gameJs.includes("if (e.key === 'Escape') {"), 'keydown listener watches for Escape key');
    assert.ok(gameJs.includes("closeMixMode();"), 'closes mix mode on Escape');
    assert.ok(gameJs.includes("closeTimerModal();"), 'closes timer on Escape');
    assert.ok(gameJs.includes("reserveModal.classList.add('hidden');"), 'closes reserve modal on Escape');

    // 7b: Robust backup import fallback
    assert.ok(gameJs.includes("decodeURIComponent(escape(atob(input)))"), 'tries UTF-8 base64 decode first');
    assert.ok(gameJs.includes("parsedRaw = JSON.parse(atob(input));"), 'falls back to standard base64 atob');
    assert.ok(gameJs.includes("parsedRaw = JSON.parse(input);"), 'falls back to direct JSON parse');
});
