const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const gameJs = fs.readFileSync(path.resolve(__dirname, '../game.js'), 'utf8');
const dynamicUiJs = fs.readFileSync(path.resolve(__dirname, '../dynamic-ui.js'), 'utf8');

test('Language and Unit toggle UI elements are present in index.html with strict CSP compliance', () => {
    assert.ok(indexHtml.includes('id="btn-lang-toggle"'), 'btn-lang-toggle must exist in index.html');
    assert.ok(indexHtml.includes('id="btn-unit-toggle"'), 'btn-unit-toggle must exist in index.html');
    assert.ok(indexHtml.includes('data-action="toggle-language"'), 'toggle-language action must be present');
    assert.ok(indexHtml.includes('data-action="toggle-unit"'), 'toggle-unit action must be present');
    assert.ok(indexHtml.includes('id="brand-title"'), 'brand-title id must exist for dynamic title switching');

    // CSP compliance - no inline onclick
    assert.ok(!indexHtml.includes('onclick="toggleLanguage'), 'No inline onclick on toggle-language');
    assert.ok(!indexHtml.includes('onclick="toggleUnit'), 'No inline onclick on toggle-unit');
});

test('Dynamic UI event delegation supports language and unit toggles', () => {
    assert.ok(dynamicUiJs.includes("case 'toggle-language':"), 'dynamic-ui.js must handle toggle-language');
    assert.ok(dynamicUiJs.includes("case 'toggle-unit':"), 'dynamic-ui.js must handle toggle-unit');
    assert.ok(dynamicUiJs.includes('toggleLanguage();'), 'dynamic-ui.js calls toggleLanguage()');
    assert.ok(dynamicUiJs.includes('toggleUnit();'), 'dynamic-ui.js calls toggleUnit()');
});

test('game.js defines I18N dictionary with full TR and EN keys', () => {
    assert.ok(gameJs.includes('const I18N = {'), 'I18N dictionary must be declared');
    assert.ok(gameJs.includes("brand: 'Bar Cepte'"), 'TR brand must be Bar Cepte');
    assert.ok(gameJs.includes("brand: 'Pocket Bar'"), 'EN brand must be Pocket Bar');
    assert.ok(gameJs.includes("title: 'Pocket Bar — Smart Home Bar & Cocktail Assistant'"), 'EN title configured');
    assert.ok(gameJs.includes("emptyBarDesc:"), 'emptyBarDesc localized');
    assert.ok(gameJs.includes("alcoholsLiquors:"), 'alcoholsLiquors localized');
    assert.ok(gameJs.includes("kitchenMixers:"), 'kitchenMixers localized');
    assert.ok(gameJs.includes("emptyShoppingList:"), 'emptyShoppingList localized');
});

test('Unit conversion functions convert cl and oz accurately', () => {
    // Extract convertClToOz and convertOzToCl from game.js and test logic
    const ozToClRegex = /function convertOzToCl\(text\) \{([\s\S]*?)\n\}/;
    const clToOzRegex = /function convertClToOz\(text\) \{([\s\S]*?)\n\}/;
    
    assert.ok(ozToClRegex.test(gameJs), 'convertOzToCl must be defined');
    assert.ok(clToOzRegex.test(gameJs), 'convertClToOz must be defined');

    const convertOzToCl = new Function('text', ozToClRegex.exec(gameJs)[1]);
    const convertClToOz = new Function('text', clToOzRegex.exec(gameJs)[1]);

    assert.strictEqual(convertOzToCl('2 oz'), '6 cl');
    assert.strictEqual(convertOzToCl('1 oz'), '3 cl');
    assert.strictEqual(convertOzToCl('1/2 oz'), '1.5 cl');

    assert.strictEqual(convertClToOz('6 cl'), '2 oz');
    assert.strictEqual(convertClToOz('3 cl'), '1 oz');
    assert.strictEqual(convertClToOz('60 ml'), '2 oz');
    assert.strictEqual(convertClToOz('45 ml'), '1.5 oz');
});

test('English ingredients mapping is defined in baseIngredients', () => {
    assert.ok(/nameEn:\s*["']Vodka["']/.test(gameJs), 'Vodka nameEn must exist');
    assert.ok(/nameEn:\s*["']Gin["']/.test(gameJs), 'Gin nameEn must exist');
    assert.ok(/nameEn:\s*["']Rum["']/.test(gameJs), 'Rum nameEn must exist');
    assert.ok(/nameEn:\s*["']Tequila["']/.test(gameJs), 'Tequila nameEn must exist');
    assert.ok(/nameEn:\s*["']Bourbon["']/.test(gameJs), 'Bourbon nameEn must exist');
    assert.ok(/nameEn:\s*["']Lime Juice["']/.test(gameJs), 'Lime Juice nameEn must exist');
});

test('Story card generator supports Pocket Bar and USD pricing in English mode', () => {
    assert.ok(gameJs.includes("currentLang === 'en' ? '🍸   P O C K E T   B A R' : '🍸   B A R   C E P T E'"), 'Pocket Bar canvas header in EN');
    assert.ok(gameJs.includes("'PocketBar' : 'BarCepte'"), 'PocketBar download filename in EN');
    assert.ok(gameJs.includes("computedCostUsd"), 'USD computed cost used for English story card');
});

test('All opening modals, panels, and reserve plans have comprehensive English localization', () => {
    const reserveJs = fs.readFileSync(path.resolve(__dirname, '../reserve.js'), 'utf8');
    const authJs = fs.readFileSync(path.resolve(__dirname, '../auth.js'), 'utf8');
    const privacyHtml = fs.readFileSync(path.resolve(__dirname, '../privacy.html'), 'utf8');
    const privacyJs = fs.readFileSync(path.resolve(__dirname, '../privacy.js'), 'utf8');

    // Reserve plans EN
    assert.ok(reserveJs.includes('PLANS_CONFIG_EN'), 'PLANS_CONFIG_EN must exist');
    assert.ok(reserveJs.includes('$2.99'), 'Monthly USD pricing in reserve.js');
    assert.ok(reserveJs.includes('$14.99'), 'Annual USD pricing in reserve.js');
    assert.ok(reserveJs.includes('$29.99'), 'Lifetime USD pricing in reserve.js');

    // Auth module i18n
    assert.ok(authJs.includes("Guest Bartender"), 'Guest Bartender English title in auth.js');
    assert.ok(authJs.includes("bartender@pocketbar.app"), 'English fallback email in auth.js');
    assert.ok(authJs.includes("RESERVE VIP MEMBER"), 'English VIP badge in auth.js');

    // Privacy page
    assert.ok(privacyHtml.includes('id="privacy-lang-toggle"'), 'privacy-lang-toggle in privacy.html');
    assert.ok(privacyHtml.includes('src="privacy.js"'), 'privacy.js loaded in privacy.html');
    assert.ok(!privacyHtml.includes('onclick='), 'Strict CSP: no onclick in privacy.html');
    assert.ok(privacyJs.includes('Privacy Policy & 18+ Legal Notice — Pocket Bar'), 'English title in privacy.js');

    // Game.js modals and panels
    assert.ok(gameJs.includes('POCKET BAR'), 'Pocket Bar in reserve heading for English');
    assert.ok(gameJs.includes('No cocktails found matching these criteria.'), 'Empty search state localized');
    assert.ok(gameJs.includes('Show More'), 'Load more button localized in game.js');
    assert.ok(gameJs.includes('1. Glassware & Prep'), 'Step-by-step mix mode steps localized in game.js');
});

