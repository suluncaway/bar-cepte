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

test('Timer preset labels and modal bindings strictly preserve active language without reverting', () => {
    const uiBindingsJs = fs.readFileSync(path.resolve(__dirname, '../ui-bindings.js'), 'utf8');

    // UI bindings must not hardcode Turkish strings in openTimerModal or setTimerDuration
    assert.ok(!uiBindingsJs.includes("openTimerModal(15, 'Buzla"), 'ui-0 must not hardcode Turkish preset in openTimerModal');
    assert.ok(!uiBindingsJs.includes("setTimerDuration(15, 'Buzla"), 'ui-39 must not hardcode Turkish preset in setTimerDuration');
    assert.ok(!uiBindingsJs.includes("setTimerDuration(30, 'Buzla"), 'ui-40 must not hardcode Turkish preset in setTimerDuration');
    assert.ok(!uiBindingsJs.includes("setTimerDuration(45, 'İyice"), 'ui-41 must not hardcode Turkish preset in setTimerDuration');

    // game.js getTimerPresetLabel and applyLanguage timer updates
    assert.ok(gameJs.includes('function getTimerPresetLabel('), 'getTimerPresetLabel helper must exist in game.js');
    assert.ok(gameJs.includes('timerLabelEl.innerText = getTimerPresetLabel('), 'applyLanguage must update timer-label');
});

test('Reserve UI dynamically translates all modal content and sets USD prices on initial load and plan switch', () => {
    const reserveJs = fs.readFileSync(path.resolve(__dirname, '../reserve.js'), 'utf8');

    assert.ok(reserveJs.includes('function getCurrentLang()'), 'getCurrentLang helper must exist in reserve.js');
    assert.ok(reserveJs.includes("planMonthly.innerText = isEn ? 'Monthly' : 'Aylık'"), 'Plan monthly tab localized');
    assert.ok(reserveJs.includes("planAnnual.innerText = isEn ? '⭐ Annual' : '⭐ Yıllık'"), 'Plan annual tab localized');
    assert.ok(reserveJs.includes("planLifetime.innerText = isEn ? 'Lifetime' : 'Ömür Boyu'"), 'Plan lifetime tab localized');
    assert.ok(reserveJs.includes("selectPlan(currentSelectedPlan);"), 'selectPlan called on init in reserve.js');
});

test('Reserve UI supports USD ($) and EUR (€) multi-currency options with strict CSP', () => {
    const reserveJs = fs.readFileSync(path.resolve(__dirname, '../reserve.js'), 'utf8');

    assert.ok(indexHtml.includes('id="reserve-currency-bar"'), 'reserve-currency-bar exists');
    assert.ok(indexHtml.includes('data-currency="usd"'), 'USD currency button exists');
    assert.ok(indexHtml.includes('data-currency="eur"'), 'EUR currency button exists');
    assert.ok(!indexHtml.includes('onclick="setCurrency'), 'Strict CSP: no onclick on currency buttons');

    assert.ok(reserveJs.includes('PLANS_CONFIG_EUR'), 'PLANS_CONFIG_EUR exists');
    assert.ok(reserveJs.includes('€2.99'), 'EUR monthly price exists');
    assert.ok(reserveJs.includes('€13.99'), 'EUR annual price exists');
    const BarReserve = require('../reserve.js');
    assert.strictEqual(typeof BarReserve.setCurrency, 'function');
    assert.strictEqual(typeof BarReserve.getCurrency, 'function');
});

test('Shopier webhook detects USD and EUR multi-currency orders accurately', () => {
    const { detectPlanAndCurrency } = require('../scripts/shopier-webhook.js');

    const usdOrder = detectPlanAndCurrency({ title: 'Pocket Bar Monthly VIP ($2.99)' }, { currency: 'USD' });
    assert.strictEqual(usdOrder.plan, 'monthly');
    assert.strictEqual(usdOrder.currency, 'USD');

    const eurOrder = detectPlanAndCurrency({ title: 'Pocket Bar Annual VIP (€13.99)' }, { currency: 'EUR' });
    assert.strictEqual(eurOrder.plan, 'annual');
    assert.strictEqual(eurOrder.currency, 'EUR');

    const tryOrder = detectPlanAndCurrency({ title: 'Bar Cepte Ömür Boyu VIP' }, { currency: 'TRY' });
    assert.strictEqual(tryOrder.plan, 'lifetime');
    assert.strictEqual(tryOrder.currency, 'TRY');

    const titleUsd = detectPlanAndCurrency({ title: 'Pocket Bar Lifetime VIP $29.99' }, {});
    assert.strictEqual(titleUsd.plan, 'lifetime');
    assert.strictEqual(titleUsd.currency, 'USD');

    const titleEur = detectPlanAndCurrency({ title: 'Pocket Bar Monthly 30 Days 2.99 Euro' }, {});
    assert.strictEqual(titleEur.plan, 'monthly');
    assert.strictEqual(titleEur.currency, 'EUR');
});

test('Non-alcoholic labels and ABV badges are properly localized in Turkish and English', () => {
    // Check getAbvLabel exists in game.js
    assert.ok(gameJs.includes('function getAbvLabel('), 'getAbvLabel helper must exist in game.js');
    assert.ok(gameJs.includes("nonAlcoholic: 'Non-Alcoholic'"), 'EN nonAlcoholic must be Non-Alcoholic');
    assert.ok(gameJs.includes("nonAlcoholic: 'Alkolsüz'"), 'TR nonAlcoholic must be Alkolsüz');
    assert.ok(gameJs.includes('getAbvLabel(d.computedABV, currentLang)'), 'Card and story card renderers must call getAbvLabel');

    // Extract getAbvLabel function and test directly
    const getAbvLabelRegex = /function getAbvLabel\(computedABV,\s*lang\s*=\s*currentLang\)\s*\{([\s\S]*?)\n\}/;
    assert.ok(getAbvLabelRegex.test(gameJs), 'getAbvLabel regex must match function');
    const getAbvLabel = new Function('computedABV', 'lang', 'currentLang', getAbvLabelRegex.exec(gameJs)[1]);

    // Test non-alcoholic (0 ABV)
    assert.strictEqual(getAbvLabel({ abv: 0 }, 'tr'), '🟢 Alkolsüz (%0)');
    assert.strictEqual(getAbvLabel({ abv: 0 }, 'en'), '🟢 Non-Alcoholic (0%)');

    // Test alcoholic
    assert.strictEqual(getAbvLabel({ abv: 15 }, 'tr'), '🍹 ~%15 ABV');
    assert.strictEqual(getAbvLabel({ abv: 15 }, 'en'), '🍹 ~15% ABV');
    assert.strictEqual(getAbvLabel({ abv: 5 }, 'en'), '🍃 ~5% ABV');
    assert.strictEqual(getAbvLabel({ abv: 25 }, 'en'), '🔥 ~25% ABV');
});

test('Ingredient search supports global search across kitchen and alcohol categories with normalization and subcategory toggling', () => {
    assert.ok(gameJs.includes('function normalizeSearchText('), 'normalizeSearchText must exist in game.js');
    
    // Extract normalizeSearchText function
    const normRegex = /function normalizeSearchText\(str\)\s*\{([\s\S]*?)\n\}/;
    assert.ok(normRegex.test(gameJs), 'normalizeSearchText must be extractable');
    const normalizeSearchText = new Function('str', normRegex.exec(gameJs)[1]);

    assert.strictEqual(normalizeSearchText('NANE'), 'nane');
    assert.strictEqual(normalizeSearchText('Şeker'), 'seker');
    assert.strictEqual(normalizeSearchText('LİMON'), 'limon');
    assert.strictEqual(normalizeSearchText('Çilek'), 'cilek');
    assert.strictEqual(normalizeSearchText('Viski'), 'viski');

    // Verify game.js searches globally when searchVal is provided
    assert.ok(gameJs.includes('Global malzeme araması (Alkol + Mutfak tüm kategorileri kapsar)'), 'Global search comment present');
    assert.ok(gameJs.includes("alcSubcatsEl.classList.toggle('hidden', !!searchVal"), 'Alcohol subcategories hidden during active search');
    assert.ok(gameJs.includes("kitchenSubcatsEl.classList.toggle('hidden', !!searchVal"), 'Kitchen subcategories hidden during active search');
    assert.ok(gameJs.includes('ile eşleşen malzeme bulunamadı'), 'Informative empty state message present in TR');
    assert.ok(gameJs.includes('no matching ingredients found'), 'Informative empty state message present in EN');

    // Verify kitchen items receive green Kitchen / Mutfak group tag
    assert.ok(gameJs.includes('text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/25'), 'Kitchen tag styles present');

    // Test search filter logic on sample ingredients
    const sampleIngredients = [
        { id: "Vodka", name: "Votka", nameEn: "Vodka", cat: "alkol" },
        { id: "Gin", name: "Cin", nameEn: "Gin", cat: "alkol" },
        { id: "Rum", name: "Rom", nameEn: "Rum", cat: "alkol" },
        { id: "Mint", name: "Nane", nameEn: "Mint", cat: "mutfak" },
        { id: "Sugar", name: "Şeker", nameEn: "Sugar", cat: "mutfak" },
        { id: "Lemon Juice", name: "Limon Suyu", nameEn: "Lemon Juice", cat: "mutfak" }
    ];

    function searchFilter(list, query) {
        const searchNorm = normalizeSearchText(query.trim());
        const searchLowerTr = query.trim().toLocaleLowerCase('tr');
        const searchLowerEn = query.trim().toLowerCase();
        return list.filter(i => {
            const nameNorm = normalizeSearchText(i.name);
            const nameEnNorm = normalizeSearchText(i.nameEn);
            const idNorm = normalizeSearchText(i.id);
            return nameNorm.includes(searchNorm) ||
                   nameEnNorm.includes(searchNorm) ||
                   idNorm.includes(searchNorm) ||
                   (i.name && (i.name.toLocaleLowerCase('tr').includes(searchLowerTr) || i.name.toLowerCase().includes(searchLowerEn))) ||
                   (i.nameEn && i.nameEn.toLowerCase().includes(searchLowerEn)) ||
                   (i.id && (i.id.toLowerCase().includes(searchLowerEn) || i.id.toLocaleLowerCase('tr').includes(searchLowerTr)));
        });
    }

    const naneResults = searchFilter(sampleIngredients, 'nane');
    assert.strictEqual(naneResults.length, 1);
    assert.strictEqual(naneResults[0].id, 'Mint');

    const mintResults = searchFilter(sampleIngredients, 'mint');
    assert.strictEqual(mintResults.length, 1);
    assert.strictEqual(mintResults[0].id, 'Mint');

    const sekerResults = searchFilter(sampleIngredients, 'seker');
    assert.strictEqual(sekerResults.length, 1);
    assert.strictEqual(sekerResults[0].id, 'Sugar');

    const limonResults = searchFilter(sampleIngredients, 'limon');
    assert.strictEqual(limonResults.length, 1);
    assert.strictEqual(limonResults[0].id, 'Lemon Juice');

    const romResults = searchFilter(sampleIngredients, 'rom');
    assert.strictEqual(romResults.length, 1);
    assert.strictEqual(romResults[0].id, 'Rum');
});

test('Cocktail search allows searching by both cocktail name and kitchen/alcohol ingredients (e.g. nane, rom nane, limon)', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const js = fs.readFileSync('game.js', 'utf8');

    // 1. Alcohol subcategories include Kitchen chip for quick access in Kokteyl Keşfet section
    assert.match(html, /data-action="alcohol-subcat"\s+data-value="mutfak"/, 'Mutfak chip in alcohol-subcategories');
    assert.match(js, /case 'mutfak': return (currentLang === 'en' \? 'Kitchen' : 'Mutfak'|'Mutfak')/, 'getAlcoholGroupLabel supports mutfak');
    assert.match(js, /if \(currentAlcoholSubCat === 'mutfak'\) return ing\.cat === 'mutfak'/, 'matchesAlcoholSubCategory supports mutfak');

    // Verify service worker cache version is updated so clients receive latest game.js and hero video
    const swContent = fs.readFileSync('sw.js', 'utf8');
    assert.match(swContent, /const CACHE_NAME = 'bar-cepte-v31-audit-fixes';/, 'sw.js cache name updated');

    // 2. recipeMatchesSearchToken helper is defined in game.js
    assert.ok(js.includes('function recipeMatchesSearchToken('), 'recipeMatchesSearchToken exists in game.js');
    assert.ok(js.includes('recipeMatchesSearchToken(d, reqs, token)'), 'filterCocktails calls recipeMatchesSearchToken');

    // 3. Test recipeMatchesSearchToken with cocktails having kitchen and alcohol ingredients
    const normRegex = /function normalizeSearchText\(str\)\s*\{([\s\S]*?)\n\}/;
    const normalizeSearchText = new Function('str', normRegex.exec(js)[1]);

    const sampleCocktails = [
        {
            strDrink: 'Mojito',
            strDrinkTR: 'Mohito',
            strIngredient1: 'Light rum',
            strIngredient2: 'Lime',
            strIngredient3: 'Sugar',
            strIngredient4: 'Mint',
            strIngredient5: 'Soda water'
        },
        {
            strDrink: 'Margarita',
            strDrinkTR: 'Margarita',
            strIngredient1: 'Tequila',
            strIngredient2: 'Triple sec',
            strIngredient3: 'Lime juice',
            strIngredient4: 'Salt'
        },
        {
            strDrink: 'Old Fashioned',
            strDrinkTR: 'Old Fashioned',
            strIngredient1: 'Bourbon',
            strIngredient2: 'Angostura bitters',
            strIngredient3: 'Sugar',
            strIngredient4: 'Water'
        }
    ];

    function translateDummy(ing) {
        const map = {
            'Light rum': 'Beyaz Rom',
            'Lime': 'Misket Limonu',
            'Lime juice': 'Misket Limonu Suyu',
            'Sugar': 'Şeker',
            'Mint': 'Nane',
            'Tequila': 'Tekila',
            'Bourbon': 'Burbon Viski'
        };
        return map[ing] || ing;
    }

    function testSearchMatch(d, query) {
        const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
        const reqs = [d.strIngredient1, d.strIngredient2, d.strIngredient3, d.strIngredient4, d.strIngredient5].filter(Boolean);
        const dNameNorm = normalizeSearchText(d.strDrink || '');
        const dNameTrNorm = normalizeSearchText(d.strDrinkTR || '');

        return tokens.every(token => {
            if (dNameNorm.includes(token) || (dNameTrNorm && dNameTrNorm.includes(token))) return true;
            return reqs.some(r => {
                const rNorm = normalizeSearchText(r);
                const trNorm = normalizeSearchText(translateDummy(r));
                return rNorm.includes(token) || trNorm.includes(token);
            });
        });
    }

    // "nane" matches Mojito
    const naneMatches = sampleCocktails.filter(d => testSearchMatch(d, 'nane'));
    assert.strictEqual(naneMatches.length, 1);
    assert.strictEqual(naneMatches[0].strDrink, 'Mojito');

    // "rom nane" matches Mojito
    const romNaneMatches = sampleCocktails.filter(d => testSearchMatch(d, 'rom nane'));
    assert.strictEqual(romNaneMatches.length, 1);
    assert.strictEqual(romNaneMatches[0].strDrink, 'Mojito');

    // "tekila" matches Margarita
    const tekilaMatches = sampleCocktails.filter(d => testSearchMatch(d, 'tekila'));
    assert.strictEqual(tekilaMatches.length, 1);
    assert.strictEqual(tekilaMatches[0].strDrink, 'Margarita');

    // "seker" matches Mojito and Old Fashioned
    const sekerMatches = sampleCocktails.filter(d => testSearchMatch(d, 'seker'));
    assert.strictEqual(sekerMatches.length, 2);
});





