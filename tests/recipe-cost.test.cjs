const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const block = src.slice(src.indexOf('// Ev Kokteyl Maliyeti Hesaplama Motoru'), src.indexOf('// Kokteyl Verilerini Bir Defa Önbelleğe Alarak'));
const load = lang => new Function('currentLang', block + '\nreturn { calculateRecipeCost, formatRecipeCost, measureToCl, TRY_PER_USD };')(lang);
const { calculateRecipeCost, measureToCl } = load('tr');
const drink = (rows, extra = {}) => Object.assign({ strAlcoholic: 'Alcoholic' }, extra,
    ...rows.map(([name, measure], i) => ({ [`strIngredient${i + 1}`]: name, [`strMeasure${i + 1}`]: measure })));

test('measures are read in centilitres from the number next to the unit', () => {
    assert.equal(measureToCl('1 1/2 oz'), 4.5);
    assert.equal(measureToCl('70ml/2fl oz'), 7);           // not 70 oz
    assert.equal(measureToCl('2-3 oz'), 6);                // lower end of a range
    assert.equal(measureToCl('Juice of 1/2'), 1.5);
    assert.equal(measureToCl('dash'), 0.1);                // unit without a number
    assert.equal(measureToCl('1 gal'), 378.5);
    assert.equal(measureToCl('1 slice'), null);            // countable, priced per piece
});

test('home cost follows the bottle prices and the bar saving varies by recipe', () => {
    const margarita = calculateRecipeCost(drink([['Tequila', '1 1/2 oz'], ['Triple sec', '1/2 oz'], ['Lime juice', '1 oz'], ['Salt', '']]));
    assert.ok(margarita.cost > 90 && margarita.cost < 180, `margarita ${margarita.cost}`);
    assert.equal(margarita.barEst, 500);
    const soda = calculateRecipeCost(drink([['Lemonade', '20 cl']], { strAlcoholic: 'Non alcoholic' }));
    assert.equal(soda.barEst, 300, 'alcohol-free drinks compare with a cheaper bar drink');
    assert.notEqual(margarita.savingsPercent, soda.savingsPercent);
    assert.ok(margarita.savingsPercent < 90, 'no longer a fixed ~87% saving');
});

test('punch and pitcher recipes are priced per serving', () => {
    const punch = calculateRecipeCost(drink([['Vodka', '1750 ml'], ['Orange juice', '1 gal']]));
    assert.ok(punch.cost < 250, `punch per serving ${punch.cost}`);
    const pitcher = calculateRecipeCost(drink([['White Rum', '200 ml'], ['Soda Water', 'Top']]));
    assert.ok(pitcher.cost < 200, `pitcher per serving ${pitcher.cost}`);
});

test('English mode converts with the configured exchange rate', () => {
    const en = load('en');
    assert.equal(en.formatRecipeCost({ computedCost: { cost: en.TRY_PER_USD * 2 } }), '~$2.00');
    assert.equal(load('tr').formatRecipeCost({ computedCost: { cost: 130 } }), '~130 ₺');
});
