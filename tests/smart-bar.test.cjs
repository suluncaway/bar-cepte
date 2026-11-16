const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const smart = require('../smart-bar.js');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const gameSrc = read('game.js');
const costBlock = gameSrc.slice(gameSrc.indexOf('// Ev Kokteyl Maliyeti Hesaplama Motoru'), gameSrc.indexOf('// Kokteyl Verilerini Bir Defa Önbelleğe Alarak'));
const { measureToCl, calculateRecipeCost } = new Function('currentLang', costBlock + '\nreturn { measureToCl, calculateRecipeCost };')('tr');
const cocktails = JSON.parse(read('cocktails.json'));
const byId = id => cocktails.find(d => d.idDrink === id);
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

test('substitutes: only one missing ingredient with a high-confidence rule and the swap in the bar', () => {
    const bar = ['Lemon juice', 'Gin'];
    const owned = name => bar.some(item => same(item, name));
    const sub = smart.findSubstitution(['Lime juice'], owned, same);
    assert.equal(sub.missing, 'Lime juice');
    assert.equal(sub.use, 'Lemon juice');
    assert.equal(sub.rule.key, 'lime juice');
    assert.equal(smart.findSubstitution(['Lime juice', 'Sugar'], owned, same), null, 'two missing: not shown');
    assert.equal(smart.findSubstitution(['Lime juice'], () => false, same), null, 'substitute not in bar');
    assert.equal(smart.findSubstitution(['Dry Vermouth'], () => true, same), null, 'low-confidence swaps are not rules');
    assert.equal(smart.findSubstitution(['Soda water'], name => same(name, 'Soda water'), same), null, 'never "substitutes" itself');
    assert.equal(smart.findSubstitution(['Carbonated water'], name => same(name, 'Soda water'), same).use, 'Soda water');
    for (const rule of smart.SUBSTITUTE_RULES) {
        assert.ok(rule.missing.length && rule.use.length && rule.tr && rule.en && rule.key, rule.key);
        assert.match(read('game.js'), new RegExp(`'${rule.key}': \\{`), `rule ${rule.key} links to INGREDIENT_SUBSTITUTES`);
    }
});

test('substitute section is wired into the recipe list and card lookups', () => {
    const html = read('index.html');
    assert.match(html, /<section id="substitute-section" class="hidden" aria-labelledby="title-substitute">/);
    assert.match(html, /id="recipes-substitute"/);
    assert.match(gameSrc, /window\.BarSmart\.findSubstitution\(item\.missingList, owned, checkIngredientMatch\)/);
    assert.match(gameSrc, /#recipes-ready > \.cocktail-card, #recipes-substitute > \.cocktail-card, #recipes-missing > \.cocktail-card/);
    assert.ok(html.indexOf('smart-bar.js') < html.indexOf('game.js?v='), 'BarSmart loads before game.js');
});

test("today's cocktail is deterministic per local date, prefers the bar, then the season", () => {
    const drinks = [
        { idDrink: '1', strDrink: 'Hot Toddy', strTags: 'Winter' },
        { idDrink: '2', strDrink: 'Eggnog', strTags: 'Christmas' },
        { idDrink: '3', strDrink: 'Mojito', strTags: 'Summer' },
        { idDrink: '4', strDrink: 'Gimlet', strTags: '' },
        { idDrink: '5', strDrink: 'Daiquiri', strTags: 'Summer,Beach' }
    ];
    const july = new Date(2026, 6, 10, 9), julyLate = new Date(2026, 6, 10, 23, 59);
    const a = smart.pickDailyCocktail(drinks, july), b = smart.pickDailyCocktail(drinks, julyLate);
    assert.equal(a.drink.idDrink, b.drink.idDrink, 'same local day, same drink');
    assert.equal(smart.pickDailyCocktail([...drinks].reverse(), july).drink.idDrink, a.drink.idDrink, 'input order does not matter');
    assert.ok(['3', '5'].includes(a.drink.idDrink), 'summer drink in July');
    assert.equal(a.occasion, 'summer');
    const nye = smart.pickDailyCocktail(drinks, new Date(2026, 11, 31));
    assert.ok(['1', '2'].includes(nye.drink.idDrink));
    assert.equal(nye.occasion, 'newyear');
    // The bar wins over the season: only Gimlet is makeable.
    const ready = smart.pickDailyCocktail(drinks, july, { missingCount: d => (d.idDrink === '4' ? 0 : 2) });
    assert.equal(ready.drink.idDrink, '4');
    assert.equal(ready.reason, 'ready');
    // Nothing makeable: the closest recipes, still seasonal when possible.
    const closest = smart.pickDailyCocktail(drinks, july, { missingCount: d => ({ '1': 1, '3': 1, '4': 3 }[d.idDrink] ?? 5) });
    assert.equal(closest.drink.idDrink, '3');
    assert.equal(closest.reason, 'closest');
    // Fixed-date occasions only.
    assert.equal(smart.occasionFor(new Date(2026, 1, 14)), 'valentine');
    assert.equal(smart.occasionFor(new Date(2026, 9, 31)), 'halloween');
    assert.equal(smart.occasionFor(new Date(2026, 3, 10)), '');
    // Over a year with the real database every day yields a drink and picks vary.
    const pool = cocktails.filter(d => d.strDrinkThumb);
    const seen = new Set();
    for (let day = 0; day < 365; day += 7) seen.add(smart.pickDailyCocktail(pool, new Date(2026, 0, 1 + day)).drink.idDrink);
    assert.ok(seen.size > 20, `varied picks (${seen.size})`);
});

test('AI preference summary is short, uses tastes and latest ratings, and skips notes', () => {
    const history = [
        { id: 'a', drinkId: '11007', name: 'Margarita', createdAt: 3, rating: 'like', taste: 'Ekşi', note: 'gizli not' },
        { id: 'b', drinkId: '11007', name: 'Margarita', createdAt: 1, rating: 'dislike', taste: 'Ekşi', note: '' },
        { id: 'c', drinkId: '11000', name: 'Mojito', createdAt: 2, rating: 'dislike', taste: 'Ferah', note: '' },
        { id: 'd', drinkId: '17212', name: 'Old\nFashioned', createdAt: 4, rating: null, taste: 'Sert', note: '' }
    ];
    const tr = smart.preferenceSummary({ alcohol: 'Alcoholic', tastes: ['Ekşi', 'Sert'] }, history);
    assert.equal(tr, 'Sevdiği tatlar: ekşi, sert; alkollü tercih ediyor; beğendi: Margarita; beğenmedi: Mojito');
    assert.doesNotMatch(tr, /gizli not|Old/);
    const en = smart.preferenceSummary({ alcohol: 'Non_Alcoholic', tastes: ['Tatlı'] }, history, { language: 'en' });
    assert.equal(en, 'Likes sweet; prefers alcohol-free; liked: Margarita; disliked: Mojito');
    assert.equal(smart.preferenceSummary({ alcohol: 'all', tastes: [] }, []), '');
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `x${i}`, drinkId: `${i}`, name: 'Very Long Cocktail Name Number ' + i, createdAt: i, rating: i % 2 ? 'like' : 'dislike' }));
    assert.ok(smart.preferenceSummary({ tastes: ['Sert', 'Tatlı', 'Ekşi', 'Ferah'] }, many).length <= 200);
    const ui = read('ai-assistant-ui.js');
    assert.match(ui, /preferences: preferenceContext\(context\.language\)/);
    assert.doesNotMatch(ui, /preferences: ''/);
    assert.match(read('privacy.html'), /en fazla 200 karakterlik kısa bir özet/);
    assert.match(read('privacy.html'), /at most 200 characters/);
});

test('party planner totals cl, rounds to bottles, splits servings and lists unmeasurable items', () => {
    const mojito = byId('11000'), margarita = byId('11007');
    const bar = ['Light rum', 'Lime'];
    const owned = name => bar.some(item => same(item, name));
    const plan = smart.planParty({ guests: 30, drinksPerGuest: 2, recipes: [mojito, margarita, mojito], measureToCl, owned, cost: d => calculateRecipeCost(d).cost });
    assert.equal(plan.totalServings, 60);
    assert.deepEqual(plan.recipes.map(r => [r.id, r.servings]), [['11000', 30], ['11007', 30]], 'duplicates removed, even split');
    const rum = plan.ingredients.find(r => same(r.name, 'Light rum'));
    const mojitoRum = measureToCl(mojito.strMeasure1);
    assert.equal(rum.cl, Math.round(mojitoRum * 30 * 10) / 10);
    assert.equal(rum.bottleCl, 70);
    assert.equal(rum.bottles, Math.ceil(rum.cl / 70));
    assert.equal(rum.owned, true);
    for (const row of plan.ingredients) {
        if (row.bottleCl) assert.ok(row.bottles * row.bottleCl >= row.cl, row.name);
        else assert.equal(row.bottles, null, `${row.name} is not bought in bottles`);
    }
    assert.ok(!plan.ingredients.some(r => same(r.name, 'Lime')), '"Juice of 1" lime is a fruit count, not cl');
    assert.ok(plan.unmeasured.some(r => same(r.name, 'Lime') && r.uses.some(u => /juice of/i.test(u.measure))));
    assert.equal(plan.ingredients.find(r => same(r.name, 'Sugar'))?.bottles ?? null, null);
    const unmeasured = plan.unmeasured.map(r => r.name.toLowerCase());
    for (let i = 1; i <= 15; i++) {
        const name = mojito[`strIngredient${i}`];
        if (!name) continue;
        const cl = mojito[`strMeasure${i}`] ? measureToCl(mojito[`strMeasure${i}`]) : null;
        if (!(cl > 0)) assert.ok(unmeasured.includes(name.toLowerCase()), `${name} listed as unmeasured`);
    }
    assert.ok(plan.missing.length > 0 && !plan.missing.some(n => same(n, 'Light rum')));
    assert.ok(Number.isFinite(plan.estimatedCost) && plan.estimatedCost > 0);
    // Bounds: 10–50 guests, 1–4 drinks, at most 3 recipes.
    const low = smart.planParty({ guests: 3, drinksPerGuest: 9, recipes: [margarita], measureToCl });
    assert.equal(low.guests, 10); assert.equal(low.drinksPerGuest, 4);
    assert.equal(smart.planParty({ guests: 500, drinksPerGuest: 0, recipes: [], measureToCl }).guests, 50);
    assert.equal(smart.planParty({ guests: 20, drinksPerGuest: 1, recipes: [], measureToCl }).ingredients.length, 0);
    const odd = smart.planParty({ guests: 11, drinksPerGuest: 1, recipes: [mojito, margarita], measureToCl });
    assert.deepEqual(odd.recipes.map(r => r.servings), [6, 5]);
    // "Fill"/"to taste" style measures never become numbers.
    const fake = { idDrink: 'x', strDrink: 'Test', strIngredient1: 'Soda water', strMeasure1: 'Fill', strIngredient2: 'Salt', strMeasure2: 'to taste', strIngredient3: 'Gin', strMeasure3: '4 cl' };
    const fakePlan = smart.planParty({ guests: 10, drinksPerGuest: 1, recipes: [fake], measureToCl });
    assert.deepEqual(fakePlan.ingredients.map(r => [r.name, r.cl, r.bottles]), [['Gin', 40, 1]]);
    assert.deepEqual(fakePlan.unmeasured.map(r => r.name), ['Soda water', 'Salt']);
});

test('party planner is Reserve-gated in the UI and announces its results accessibly', () => {
    const ui = read('party-ui.js');
    assert.match(ui, /const active = reserveActive\(\);/);
    assert.match(ui, /active \? formMarkup\(\) : lockedMarkup\(\)/);
    assert.match(ui, /if \(reserveActive\(\)\) submit\(event\.target\);/);
    assert.match(ui, /if \(!lastPlan \|\| !reserveActive\(\)\) return;/);
    assert.match(ui, /document\.getElementById\('btn-open-reserve'\)\?\.click\(\)/);
    assert.match(ui, /<label for="party-guests">/);
    assert.match(ui, /role="alert"/);
    assert.match(ui, /aria-live="polite"/);
    assert.match(ui, /Sorumlu tüketim/);
    assert.match(ui, /Drink responsibly/);
    assert.doesNotMatch(ui, /data-personal=/, 'does not collide with the personal-ui click handler');
    assert.match(read('index.html'), /<section id="party-planner" class="personal-panel party-planner" aria-labelledby="party-title"><\/section>/);
    assert.match(read('reserve.js'), /root\.BarPartyUI\.refresh\(\)/);
    for (const list of ['web-assets.json', 'sw.js', 'package.json']) {
        assert.match(read(list), /smart-bar\.js/, list);
        assert.match(read(list), /party-ui\.js/, list);
    }
});

test('Reserve copy promises only delivered benefits', () => {
    for (const file of ['index.html', 'game.js', 'reserve.js']) {
        const text = read(file);
        assert.doesNotMatch(text, /Speakeasy|gizli kokteyl|secret cocktails|ÖZEL SEÇKİ KULÜBÜ|EXCLUSIVE CURATION|öncelikli destek|priority support/i, file);
    }
    assert.match(read('index.html'), /<strong>Parti planlayıcısı:<\/strong> 10–50 misafir/);
    assert.match(read('reserve.js'), /<strong>Party planner:<\/strong>/);
});

test('signed-in Google users get a confirmed account deletion that calls the server', () => {
    const html = read('index.html');
    const auth = read('auth.js');
    assert.match(html, /id="btn-auth-delete-account" type="button" aria-describedby="auth-delete-desc"/);
    assert.match(html, /id="auth-delete-section" class="hidden/);
    assert.match(auth, /deleteSection\.classList\.toggle\('hidden',!cloudEnabled\)/);
    const handler = auth.slice(auth.indexOf("getElementById('btn-auth-delete-account');\n        if (deleteAccountBtn)"));
    assert.ok(handler.indexOf('confirm(') < handler.indexOf('await deleteCloudAccount()'), 'confirmation comes first');
    assert.match(auth, /accountRequest\('\/api\/account',\{method:'DELETE'\}\)/);
});

test('Android reports its installed version so the update check compares the right number', () => {
    const activity = read('android/app/src/main/java/com/barcepte/app/MainActivity.java');
    assert.match(activity, /@JavascriptInterface\s+public String getAppVersion\(\) \{\s+return BuildConfig\.VERSION_NAME;/);
    const fnSrc = gameSrc.slice(gameSrc.indexOf('function getInstalledAppVersion()'), gameSrc.indexOf('let currentLang'));
    const run = bridge => new Function('window', 'CURRENT_APP_VERSION', fnSrc + '\nreturn getInstalledAppVersion();')({ AndroidBridge: bridge }, '1.1.0');
    assert.equal(run(undefined), '1.1.0');
    assert.equal(run({ getAppVersion: () => '1.2.0' }), '1.2.0');
    assert.equal(run({ getAppVersion: () => 'v1.3.1' }), '1.3.1');
    assert.equal(run({ getAppVersion: () => '<script>' }), '1.1.0');
    assert.equal(run({ getAppVersion: () => { throw new Error('bridge gone'); } }), '1.1.0');
    assert.match(gameSrc, /isNewerVersion\(getInstalledAppVersion\(\), latestTag\)/);
});
