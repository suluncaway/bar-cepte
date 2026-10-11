const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const security = require('../security.js');
const valid = {
    idDrink: 'custom_123', strDrink: 'Test', strInstructions: 'Karıştır',
    customIngredients: ['Gin'], strDrinkThumb: '', strAlcoholic: 'Alcoholic'
};
test('normal backup retains valid recipe and Turkish strings', () => {
    const result = security.backup({ customs: [valid], shopping: ['Şeker'], favorites: ['123'], selected: ['Gin'] });
    assert.equal(result.customs[0].strDrink, 'Test');
    assert.equal(result.shopping[0], 'Şeker');
});
test('malformed and oversized backup fields are rejected', () => {
    for (const payload of [null, [], {shopping: [{}]}, {customs: [{}]}, {selected: ['a'.repeat(201)]}]) {
        assert.throws(() => security.backup(payload));
    }
    assert.throws(() => security.backup({customs: Array(301).fill(valid)}));
});
test('injected recipe IDs and duplicate IDs are rejected', () => {
    assert.throws(() => security.recipe({...valid, idDrink: "custom_');alert(1);//"}));
    assert.throws(() => security.recipes([valid, valid]));
});
test('unknown computed HTML/class fields never survive import', () => {
    const result = security.recipe({...valid, computedABV: {badgeCls: '"><img onerror=alert(1)>'}});
    assert.equal(result.computedABV, undefined);
});
test('image protocols and origins are allowlisted', () => {
    for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://tracker.invalid/x',
        'https://www.thecocktaildb.com.evil.invalid/images/a', 'https://attacker.invalid/x']) {
        assert.equal(security.safeImage(url), '');
    }
    assert.ok(security.safeImage('data:image/png;base64,aGVsbG8='));
    assert.ok(security.safeImage('https://www.thecocktaildb.com/images/media/drink/a.jpg'));
});
test('release links cannot leave the expected repository', () => {
    assert.equal(security.releaseURL('javascript:alert(1)'), 'https://github.com/suluncaway/bar-cepte/releases/latest');
    assert.equal(security.releaseURL('https://github.com/attacker/repo/releases/a'), 'https://github.com/suluncaway/bar-cepte/releases/latest');
});
test('malformed or inaccessible local storage does not crash startup', () => {
    global.localStorage = {getItem: () => '{'};
    assert.deepEqual(security.readStored('test', security.stringList), []);
    global.localStorage = {getItem: () => {throw new Error('blocked');}};
    assert.deepEqual(security.readStored('test', security.stringList), []);
});
test('UI contains no executable inline handlers, scripts or CDN runtime', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const js = fs.readFileSync('game.js', 'utf8');
    assert.doesNotMatch(html, /\son(?:click|input|error)\s*=/);
    assert.doesNotMatch(html, /<script\s*>/);
    assert.doesNotMatch(js, /\son(?:click|error)\s*=/);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
    assert.match(html, /script-src-attr 'none'/);
    assert.match(html, /object-src 'none'/);
});
