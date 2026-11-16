// Behaviour locks for client-side fixes: sync merge, translation failures, opening recipes by id,
// ingredient matching, substitutes and custom-recipe ingredient parsing.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const slice = (from, to) => {
    const start = src.indexOf(from);
    const end = src.indexOf(to, start + 1);
    assert.ok(start >= 0 && end > start, `game.js block ${from} .. ${to}`);
    return src.slice(start, end);
};
const baseIngredients = slice('const baseIngredients', 'let currentLang');
const matchBlock = slice('// Malzeme satırının başındaki ölçüyü', '// Barmen Modu');
const matcher = new Function(`${baseIngredients}
let popularIngredients = [...baseIngredients, { id: 'Lemon', name: 'Limon', nameEn: 'Lemon' }];
${matchBlock}
return { checkIngredientMatch, splitMeasureAndName, splitCustomIngredients, stripLeadingMeasure };`)();

test('ingredient matching rejects product-changing qualifiers and reverse matches', () => {
    const { checkIngredientMatch: match } = matcher;
    const wrong = [
        ['Ginger Beer', 'Beer'], ['Root beer', 'Beer'], ['Coffee liqueur', 'Coffee'], ['Coffee brandy', 'Coffee'],
        ['Bacardi Limon', 'Lemon'], ['Bacardi Limon', 'Limon'], ['Vanilla ice-cream', 'Ice'], ['Tonic water', 'Water'],
        ['Soda water', 'Water'], ['Dr. Pepper', 'Pepper'], ['Coconut milk', 'Milk'], ['Sloe gin', 'Gin'],
        ['Ginger ale', 'Gin'], ['Lime vodka', 'Lime'], ['Orange bitters', 'Orange'], ['Orange Curacao', 'Orange'],
        ['Cherry brandy', 'Cherry'], ['Sugar syrup', 'Sugar'], ['Irish cream', 'Cream'], ['Lemon-lime soda', 'Lemon'],
        // reverse direction: a more specific bar item only covers the generic recipe ingredient when the
        // extra words merely narrow the same product. Soda water is not "Water", lime vodka is not "Lime".
        ['Water', 'Soda Water'], ['Water', 'Tonic water'], ['Lime', 'Lime vodka'], ['Rum', 'Malibu rum'],
        ['Rum', '151 proof rum'], ['Cream', 'Irish cream'], ['Cream', 'Whipped cream'], ['Vodka', 'Lime vodka'],
        ['Egg', 'Egg White'], ['Egg', 'Egg yolk'], ['Lime', 'Lime peel'], ['Sugar syrup', 'Sugar']
    ];
    for (const [recipe, user] of wrong) assert.equal(match(recipe, user), false, `${user} must not satisfy ${recipe}`);
    const right = [
        ['Lime juice', 'Lime'], ['Fresh Lime Juice', 'Lime Juice'], ['Dark rum', 'Rum'], ['Light rum', 'Rum'],
        ['Lemon peel', 'Lemon'], ['Egg white', 'Egg White'], ['Heavy cream', 'Cream'], ['Angostura bitters', 'Bitters'],
        ['Ice', 'Ice'], ['Ice', 'Buz'], ['Gin', 'Gin'], ['Club soda', 'Soda Water'], ['Irish whiskey', 'Whiskey'],
        ['50 ml Votka', 'Vodka'], ['4,5 cl Votka', 'Vodka'], ['25 ml Limon Suyu', 'Lemon Juice'],
        // reverse direction (previously locked as false by mistake): the specific bar item covers the generic one
        ['Lime', 'Lime Juice'], ['Rum', 'Dark rum']
    ];
    for (const [recipe, user] of right) assert.equal(match(recipe, user), true, `${user} should satisfy ${recipe}`);
});

// Two-way table: [recipe ingredient, bar ingredient, generic-in-bar satisfies specific recipe?,
// specific-in-bar satisfies generic recipe?]. Each row is checked in both directions so a change to
// either rule shows up here. Egg White/Egg yolk deliberately do not cover a whole "Egg" (flips and
// eggnog need both parts); a whole egg does cover "Egg white". "Sugar syrup" covers "Sugar" (it is
// dissolved anyway), plain sugar does not count as syrup (that is offered as a substitute instead).
test('ingredient matching table: narrower bar items cover generic recipe ingredients, not the reverse of product changes', () => {
    const { checkIngredientMatch: match } = matcher;
    const rows = [
        // generic, specific, match(specific recipe, generic bar), match(generic recipe, specific bar)
        ['Rum', 'Light rum', true, true], ['Rum', 'Dark rum', true, true], ['Rum', 'White rum', true, true],
        ['Rum', 'Spiced rum', true, true], ['Rum', 'Añejo rum', true, true], ['Rum', 'Gold rum', true, true],
        ['Whiskey', 'Irish whiskey', true, true], ['Whiskey', 'Blended whiskey', true, true],
        ['Vermouth', 'Sweet Vermouth', true, true], ['Vermouth', 'Dry Vermouth', true, true],
        ['Vodka', 'Absolut Vodka', true, true], ['Cream', 'Heavy cream', true, true],
        ['Lemon juice', 'Fresh Lemon Juice', true, true], ['Lime', 'Lime Juice', true, true],
        ['Sugar', 'Sugar syrup', false, true], ['Egg', 'Egg White', true, false], ['Egg', 'Egg yolk', true, false],
        ['Beer', 'Ginger beer', false, false], ['Coffee', 'Coffee liqueur', false, false],
        ['Lemon', 'Bacardi Limon', false, false], ['Ice', 'Vanilla ice-cream', false, false],
        ['Water', 'Tonic water', false, false], ['Pepper', 'Dr. Pepper', false, false],
        ['Milk', 'Coconut milk', false, false], ['Gin', 'Sloe gin', false, false],
        ['Orange', 'Orange curacao', false, false], ['Orange', 'Orange bitters', false, false],
        ['Mint', 'Mint syrup', false, false], ['Lime', 'Lime vodka', false, false],
        ['Cream', 'Irish cream', false, false], ['Rum', 'Malibu rum', false, false]
    ];
    for (const [generic, specific, forward, reverse] of rows) {
        assert.equal(match(specific, generic), forward, `bar "${generic}" for recipe "${specific}"`);
        assert.equal(match(generic, specific), reverse, `bar "${specific}" for recipe "${generic}"`);
    }
    // Turkish custom recipes: the bar item's Turkish name narrows the same product.
    const trMatch = new Function(`${baseIngredients}
let popularIngredients = [...baseIngredients, { id: 'Light rum', name: 'Açık Rom', nameEn: 'Light rum' },
    { id: 'Heavy cream', name: 'Koyu Krema', nameEn: 'Heavy cream' }, { id: 'Malibu rum', name: 'Hindistan Cevizi Romu', nameEn: 'Malibu rum' }];
${matchBlock}
return checkIngredientMatch;`)();
    assert.equal(trMatch('50 ml Rom', 'Light rum'), true);
    assert.equal(trMatch('100 ml Krema', 'Heavy cream'), true);
    assert.equal(trMatch('50 ml Rom', 'Malibu rum'), false);
    assert.equal(trMatch('2 cl Misket Limonu', 'Lime Juice'), true);
    assert.equal(trMatch('2 cl Limon', 'Lime Juice'), false, 'lime juice is not lemon');
});

test('Mojito bar (Light rum, Lime Juice, Sugar syrup, Mint, Soda Water) makes Mojito and Frozen Mint Daiquiri', () => {
    const { checkIngredientMatch: match } = matcher;
    const drinks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cocktails.json'), 'utf8'));
    const bar = ['Light rum', 'Lime Juice', 'Sugar syrup', 'Mint', 'Soda Water'];
    const ready = drinks.filter(d => {
        const reqs = [];
        for (let i = 1; i <= 15; i++) if (d[`strIngredient${i}`]) reqs.push(d[`strIngredient${i}`]);
        return reqs.length && reqs.every(r => bar.some(s => match(r, s)));
    }).map(d => d.strDrink).sort();
    // The pre-rewrite matcher showed exactly these two; the rewrite must not show fewer.
    assert.deepEqual(ready, ['Frozen Mint Daiquiri', 'Mojito']);
});

test('Rum + Beer no longer makes Dark and Stormy ready (ginger beer missing)', () => {
    const { checkIngredientMatch: match } = matcher;
    const darkAndStormy = ['Dark rum', 'Ginger beer'];
    const selected = ['Rum', 'Beer'];
    const missing = darkAndStormy.filter(r => !selected.some(s => match(r, s)));
    assert.deepEqual(missing, ['Ginger beer']);
});

test('leading measures are removed only when a unit follows the number', () => {
    const { splitMeasureAndName: split, stripLeadingMeasure: strip } = matcher;
    assert.deepEqual(split('50 ml Votka'), { measure: '50 ml', name: 'Votka' });
    assert.deepEqual(split('4,5 cl Votka'), { measure: '4,5 cl', name: 'Votka' });
    assert.deepEqual(split('1 1/2 oz Gin'), { measure: '1 1/2 oz', name: 'Gin' });
    assert.deepEqual(split('2 yemek kaşığı Şeker'), { measure: '2 yemek kaşığı', name: 'Şeker' });
    assert.equal(strip('7-Up'), '7-Up');
    assert.equal(strip('151 proof rum'), '151 proof rum');
    assert.equal(strip('Buz'), 'Buz');
    assert.ok(!/\[\\d\\s\\\/\.,-\]\+\(/.test(slice('function autoExtractAllIngredients', 'function scrollIngredients')),
        'autoExtractAllIngredients uses the shared measure helper');
});

test('custom recipe ingredients keep decimal commas and accept new lines / semicolons', () => {
    const { splitCustomIngredients: split } = matcher;
    assert.deepEqual(split('4,5 cl Votka, 2,5 cl Limon Suyu, Buz'), ['4,5 cl Votka', '2,5 cl Limon Suyu', 'Buz']);
    assert.deepEqual(split('50 ml Votka\n25 ml Limon Suyu;Buz'), ['50 ml Votka', '25 ml Limon Suyu', 'Buz']);
    assert.deepEqual(split('Votka,Tonik'), ['Votka', 'Tonik']);
    assert.match(slice('async function saveCustomRecipe', 'if(!name ||'), /splitCustomIngredients\(ingredientsRaw\)/);
});

test('substitutes match whole words: missing Gin is not offered ginger beer', () => {
    const block = slice('const INGREDIENT_SUBSTITUTES', 'function showToast');
    const escape = slice('function escapeRegExp', '// Akıllı ve Hassas');
    const substitute = new Function(`${escape}${block}return getIngredientSubstitute;`)();
    assert.equal(substitute('Gin'), null);
    assert.equal(substitute('Beer'), null);
    assert.match(substitute('Ginger beer').subEn, /Ginger Ale/);
    assert.match(substitute('Sugar syrup').subEn, /Simple Syrup/);
    assert.ok(substitute('Lime juice'));
});

function loadSync(fetchImpl, existing) {
    const block = slice('const SYNC_INTERVAL_MS', '// ==========================================\n// OTOMATİK SÜRÜM');
    const storage = {};
    const env = {
        allCocktails: existing,
        toasts: [],
        storage
    };
    const api = new Function('env', 'fetch', `
        let allCocktails = env.allCocktails; const customRecipes = []; const db = null; const currentTab = 'alkol';
        let currentLang = 'tr'; const I18N = { tr: { statusCount: 'tarif' } };
        const localStorage = { getItem: k => env.storage[k] ?? null, setItem: (k, v) => { env.storage[k] = v; } };
        const navigator = { onLine: true };
        const document = { getElementById: () => null };
        const isValidCocktailObject = d => typeof d.idDrink === 'string' && typeof d.strDrink === 'string';
        const enrichDrink = () => {}, autoExtractAllIngredients = () => {}, renderIngredients = () => {},
            filterCocktails = () => {}, renderMyRecipes = () => {}, triggerHaptic = () => {};
        const showToast = (message, type) => env.toasts.push({ message, type });
        const alert = message => env.toasts.push({ message, type: 'alert' });
        const setTimeout = fn => fn();
        ${block}
        return { mergeCocktailLists, updateDataInBackground, forceSyncOnlineDatabase, current: () => allCocktails };
    `)(env, fetchImpl);
    return { api, env };
}

test('online sync never empties or shrinks the recipe list and keeps Turkish instructions', async () => {
    const existing = [
        { idDrink: '1', strDrink: 'Martini', strInstructions: 'Stir.', strInstructionsTR: 'Karıştır.' },
        { idDrink: '2', strDrink: 'Mojito', strInstructions: 'Muddle.' }
    ];
    const offline = loadSync(async () => { throw new Error('offline'); }, existing);
    const failed = await offline.api.forceSyncOnlineDatabase();
    assert.equal(failed.ok, false);
    assert.equal(offline.api.current().length, 2, 'existing recipes kept when the network fails');
    assert.equal(offline.env.toasts.at(-1).type, 'error');
    assert.doesNotMatch(offline.env.toasts.at(-1).message, /başarıyla/);
    assert.equal(offline.env.storage.bar_cepte_last_sync, undefined, 'failed sync is not recorded');

    // API returns only one (updated) drink for one letter and nothing for the others.
    const partial = loadSync(async url => ({
        ok: true,
        json: async () => ({ drinks: /f=m$/.test(url) ? [{ idDrink: '1', strDrink: 'Martini', strInstructions: 'Stir well.', strInstructionsTR: null }, { idDrink: '3', strDrink: 'Margarita', strInstructions: 'Shake.' }] : null })
    }), existing);
    const result = await partial.api.forceSyncOnlineDatabase();
    assert.equal(result.ok, true);
    const list = partial.api.current();
    assert.deepEqual(list.map(d => d.idDrink).sort(), ['1', '2', '3']);
    const martini = list.find(d => d.idDrink === '1');
    assert.equal(martini.strInstructions, 'Stir well.');
    assert.equal(martini.strInstructionsTR, 'Karıştır.', 'Turkish translation survives the merge');
    assert.match(partial.env.toasts.at(-1).message, /1 yeni/);
});

test('failed translation is not stored as Turkish instructions', () => {
    const translate = slice('async function translateToTurkish', 'function autoExtractAllIngredients');
    assert.match(translate, /catch \{[\s\S]*?return null;/);
    assert.doesNotMatch(translate, /catch \{\s*return cleanInstructionText\(text\)/);
    const card = slice('const trText = await translateToTurkish', '} else {\n                details.classList.remove');
    assert.match(card, /if \(trText\) \{[\s\S]*d\.strInstructionsTR = cleanInstructionText\(trText\)/);
});

test('openCocktail opens the card with the requested id, not the first search hit', () => {
    const block = slice('function findCocktailCardById', 'function applyLanguage');
    const clicked = [];
    const makeCard = (id, name) => ({
        dataset: { drinkId: id }, name,
        querySelector: () => ({ classList: { contains: () => false } }),
        scrollIntoView() {}, click() { clicked.push(name); }
    });
    const cards = [makeCard('17212', 'Espresso Martini'), makeCard('11728', 'Martini')];
    const document = {
        getElementById: id => (id === 'cocktail-search' ? { value: '' } : null),
        querySelectorAll: () => cards,
        querySelector: () => null
    };
    const openCocktail = new Function('document', 'switchTab', 'filterCocktails', 'setTimeout',
        `${block}; return openCocktail;`)(document, () => {}, () => {}, fn => fn());
    openCocktail({ idDrink: '11728', strDrink: 'Martini' });
    assert.deepEqual(clicked, ['Martini']);
    assert.match(src, /card\.dataset\.drinkId = d\.idDrink;/);
});

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('favoriting only updates the heart buttons instead of re-rendering the list', () => {
    const fav = slice('function toggleFavorite', 'function toggleShoppingList');
    assert.match(fav, /data-action="favorite"/);
    assert.match(fav, /aria-pressed/);
    assert.match(fav, /if \(onlyFavoritesFilter && !nowFav\) filterCocktails\(\);/);
    assert.equal((fav.match(/filterCocktails\(\)/g) || []).length, 1);
});

test('empty ready list without filters points at near-miss recipes and hides "clear filters"', () => {
    const block = slice('function hasActiveCocktailFilters', 'function renderLists');
    assert.match(block, /1-4 eksikle yapabileceklerin aşağıda/);
    assert.match(slice('function renderLists', 'let currentIndex'), /hasActiveCocktailFilters\(\) \? `<button type="button" data-action="reset-filters"/);
});

test('recipe cards are keyboard operable and labelled', () => {
    const card = slice('function createCocktailCardElement', 'const COCKTAIL_PAGE_SIZE');
    assert.match(card, /<button type="button" class="[^"]*toggle-icon[^"]*" aria-expanded="false" aria-controls="\$\{cardId\}_details">/);
    assert.match(card, /id="\$\{cardId\}_details"/);
    assert.match(card, /<img [^>]*alt="\$\{safeDrinkName\}"/);
    assert.match(card, /data-action="favorite"[^>]*aria-label=/);
    assert.match(card, /data-action="share"[^>]*aria-label=/);
    assert.match(card, /data-action="delete"[^>]*aria-label=/);
    assert.doesNotMatch(card, /cursor-pointer select-none/);
});

test('modals are dialogs with labelled close buttons; body text stays selectable', () => {
    const html = read('index.html');
    for (const id of ['shaker-timer-modal', 'update-modal', 'reserve-modal', 'auth-modal']) {
        assert.match(html, new RegExp(`id="${id}" role="dialog" aria-modal="true"`), id);
    }
    assert.match(html, /data-ui="ui-44" type="button" aria-label="Kapat"/);
    assert.match(html, /id="btn-close-reserve" type="button" aria-label="Kapat"/);
    assert.match(html, /id="btn-close-auth" type="button" aria-label="Kapat"/);
    assert.match(html, /data-ui="ui-30" type="button" aria-label=/);
    assert.match(html, /data-ui="ui-31" type="button" aria-label=/);
    assert.doesNotMatch(html.match(/<body[^>]*>/)[0], /select-none/);
    for (const id of ['custom-name', 'custom-ingredients', 'custom-instructions', 'custom-serving']) {
        assert.match(html, new RegExp(`id="${id}"[^>]*aria-label=`), id);
    }
    const bindings = read('ui-bindings.js');
    assert.match(bindings, /manageDialogFocus/);
    assert.match(bindings, /opener\.|target\.focus/);
    const apply = slice('function applyLanguage', 'function setLanguage');
    assert.match(apply, /document\.documentElement\.lang = /);
    assert.match(apply, /syncThemeToggle\(\)/);
});

test('service worker update shows a reload toast', () => {
    assert.match(read('ui-bindings.js'), /showToast\(message, 'info', action\)/);
});

test('one app version source and no download dialog on the web', () => {
    const html = read('index.html');
    assert.doesNotMatch(html, /v1\.[0-9]\.[0-9]/, 'index.html carries no hard-coded version');
    assert.equal((src.match(/const CURRENT_APP_VERSION = "([\d.]+)"/) || [])[1], JSON.parse(read('package.json')).version);
    assert.doesNotMatch(src, /\(v1\.1\.0\)|v1\.2\.0/);
    const update = slice('function getUpdatePlatform', 'function closeUpdateModal');
    assert.match(update, /if \(platform === 'web'\) return;/);
    assert.match(update, /platform === 'linux'[\s\S]*\.appimage/);
});

test('AI assistant requests time out and report offline state', () => {
    const ai = read('ai-assistant-ui.js');
    assert.match(ai, /REQUEST_TIMEOUT_MS = 30000/);
    assert.match(ai, /signal: controller\?\.signal/);
    assert.match(ai, /navigator\.onLine === false/);
});

test('manifest uses the product name, scope/id and the design ground colour', () => {
    const manifest = JSON.parse(read('manifest.json'));
    assert.equal(manifest.name, 'Bar Cepte');
    assert.ok(manifest.id && manifest.scope);
    assert.equal(manifest.theme_color, '#0e131d');
    assert.equal(manifest.background_color, '#0e131d');
    assert.match(read('index.html'), /<meta name="theme-color" content="#0e131d">/);
    assert.match(read('DESIGN.md'), /`--bg-main` \| `#0e131d`/);
});

test('tailwind scans every script that writes utility classes', () => {
    const input = read('tailwind.input.css');
    for (const file of ['reserve.js', 'auth.js', 'personal-ui.js', 'editorial-ui.js', 'ai-assistant-ui.js', 'dynamic-ui.js']) {
        assert.match(input, new RegExp(`@source "\\./${file.replace('.', '\\.')}"`), file);
    }
});
