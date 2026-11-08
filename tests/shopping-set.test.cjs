const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const start = src.indexOf('function bestShoppingSet(');
const end = src.indexOf('// Akıllı Tavsiye Motoru');
const bestShoppingSet = new Function(src.slice(start, end) + '\nreturn bestShoppingSet;')();
const m = (...missing) => ({ missingList: missing });

test('the shopping set completes more recipes than any single ingredient', () => {
    const matches = [m('Tonic'), m('Tonic'), m('Lime'), m('Tonic', 'Lime'), m('Tonic', 'Lime'), m('Tonic', 'Lime'), m('Mint', 'Soda'), m('Kahlua', 'Cream', 'Milk', 'Egg')];
    const { items, unlocked } = bestShoppingSet(matches);
    assert.deepEqual(items.slice(0, 2).sort(), ['Lime', 'Tonic']);
    assert.ok(unlocked >= 6, `unlocked ${unlocked}`);   // 2 tonic + 1 lime + 3 tonic&lime
    assert.ok(items.length <= 3);
});

test('recipes missing more than three ingredients are ignored and empty input is safe', () => {
    assert.deepEqual(bestShoppingSet([m('A', 'B', 'C', 'D')]), { items: [], unlocked: 0 });
    assert.deepEqual(bestShoppingSet([]), { items: [], unlocked: 0 });
});
