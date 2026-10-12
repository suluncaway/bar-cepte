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
