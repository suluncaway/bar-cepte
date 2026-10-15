const test = require('node:test');
const assert = require('node:assert/strict');
const {snapshot, restore} = require('../storage-migration');
function storage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        get length() {return values.size;}, key: i => [...values.keys()][i],
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)
    };
}
test('Android origin migration preserves Turkish recipes, preferences, and existing destination data', () => {
    const legacy = storage({customRecipes: '[{"strDrink":"Çilek 🥂"}]', bar_cepte_lang: 'tr', selectedIngredients: '["Gin"]'});
    const destination = storage({bar_cepte_lang: 'en'});
    assert.equal(restore(destination, snapshot(legacy)), true);
    assert.equal(destination.getItem('customRecipes'), legacy.getItem('customRecipes'));
    assert.equal(destination.getItem('bar_cepte_lang'), 'en');
    assert.equal(legacy.length, 3);
    restore(destination, snapshot(legacy));
    assert.equal(destination.length, 3);
});
test('Android migration rolls back partial writes on quota errors and retains legacy storage', () => {
    const legacy = storage({favorites: '["123"]', customs: 'large recipe'});
    const destination = storage({existing: 'keep'});
    const write = destination.setItem;
    destination.setItem = (key, value) => {if(key === 'customs') throw new Error('quota'); write(key, value);};
    assert.throws(() => restore(destination, snapshot(legacy)), /quota/);
    assert.equal(destination.getItem('favorites'), null);
    assert.equal(destination.getItem('existing'), 'keep');
    assert.equal(legacy.length, 2);
});
