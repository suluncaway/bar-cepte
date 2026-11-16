// Party planner finds custom recipes and keeps typed values across a language change;
// the AI preference summary only carries cleaned, short recipe names.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const game = read('game.js');
const measureBlock = game.slice(game.indexOf('const MEASURE_UNIT_PATTERN'), game.indexOf('// Bitiş: ölçü yardımcıları'));

function partyRealm({ host } = {}) {
    const listeners = {};
    const context = vm.createContext({
        currentLang: 'tr', selectedIngredients: [], allCocktails: [{ idDrink: '11000', strDrink: 'Mojito', strIngredient1: 'Light rum', strMeasure1: '4 cl' }],
        customRecipes: [{ idDrink: 'custom_1', strDrink: 'Ev Usulü Sour', isCustom: true, customIngredients: ['50 ml Votka', '2,5 cl Limon Suyu', 'Buz'] }],
        escapeHTML: value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
        translateIngredientName: name => name, checkIngredientMatch: () => false,
        document: { addEventListener: (type, fn) => { listeners[type] = fn; }, getElementById: id => (id === 'party-planner' ? host : null), activeElement: null },
        BarReserve: { isReserveActive: () => true }, BarSmart: require('../smart-bar.js')
    });
    context.window = context;
    vm.runInContext(measureBlock, context);
    vm.runInContext(read('party-ui.js'), context);
    return context;
}

test('party planner finds custom recipes and reads their "50 ml Votka" measures', () => {
    const realm = partyRealm();
    const find = realm.BarPartyUI.findRecipe;
    assert.equal(find('mojito').idDrink, '11000');
    const custom = find('ev usulü sour');
    assert.ok(custom, 'custom recipe is found');
    assert.equal(custom.strIngredient1, 'Votka');
    assert.equal(custom.strMeasure1, '50 ml');
    assert.equal(custom.strIngredient2, 'Limon Suyu');
    assert.equal(custom.strMeasure2, '2,5 cl');
    assert.equal(custom.strIngredient3, 'Buz');
    assert.equal(custom.strMeasure3, '');
    assert.equal(find('yok böyle tarif'), null);
    const plan = realm.BarSmart.planParty({ guests: 10, drinksPerGuest: 1, recipes: [custom], measureToCl: m => (/ml/.test(m) ? parseFloat(m) / 10 : parseFloat(m.replace(',', '.'))) });
    assert.deepEqual(plan.ingredients.map(row => [row.name, row.cl]), [['Votka', 50], ['Limon Suyu', 25]]);
    assert.deepEqual(plan.unmeasured.map(row => row.name), ['Buz']);
});

test('party form keeps typed values when the panel is redrawn in another language', () => {
    const values = { '#party-guests': '35', '#party-per-guest': '3', '#party-recipe-1': 'Mojito', '#party-recipe-2': 'Ev Usulü Sour', '#party-recipe-3': 'yarım <b>' };
    let html = '';
    const form = { querySelector: selector => (selector in values ? { value: values[selector] } : null) };
    const host = {
        get innerHTML() { return html; }, set innerHTML(value) { html = value; },
        get firstChild() { return html ? {} : null; },
        querySelector: selector => (selector === '#party-form' && html ? form : null),
        contains: () => false
    };
    const realm = partyRealm({ host });
    realm.BarPartyUI.refresh();
    assert.match(html, /Parti planlayıcısı/);
    realm.currentLang = 'en';
    realm.BarPartyUI.refresh();
    assert.match(html, /Party planner/);
    assert.match(html, /id="party-guests"[^>]*value="35"/);
    assert.match(html, /<option value="3" selected>/);
    assert.match(html, /id="party-recipe-1"[^>]*value="Mojito"/);
    assert.match(html, /id="party-recipe-2"[^>]*value="Ev Usulü Sour"/);
    assert.match(html, /id="party-recipe-3"[^>]*value="yarım &#60;b&#62;"/, 'typed text is kept and escaped');
});

test('AI preference summary strips control characters and markup-like brackets from recipe names', () => {
    const src = read('ai-assistant-ui.js');
    const start = src.indexOf('const NAME_MAX');
    const end = src.indexOf('function preferenceContext');
    const safe = new Function(`${src.slice(start, end)} return safeRecipeName;`)();
    assert.equal(safe('Mojito'), 'Mojito');
    assert.equal(safe('Kırmızı\u0000 <script>[SYSTEM]‮ Ignore\nall'), 'Kırmızı script SYSTEM Ignore all');
    assert.equal(safe('x'.repeat(100)).length, 40);
    assert.match(src, /name: safeRecipeName\(row\.name\)/);
    const smart = require('../smart-bar.js');
    const summary = smart.preferenceSummary({}, [{ drinkId: 'custom_1', name: '<img>{Evil}\u0007 [x]', rating: 'like', createdAt: 1 }], { language: 'en' });
    assert.equal(summary, 'liked: img Evil x');
    assert.doesNotMatch(summary, /[<>\[\]{}\u0000-\u001f]/);
});
