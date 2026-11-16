const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mergeDrinks, KEPT_FIELDS } = require('../scripts/build-cocktails-db.js');

const dbPath = path.join(__dirname, '..', 'cocktails.json');
const UNUSED = ['strInstructionsIT', 'strInstructionsFR', 'strInstructionsES', 'strInstructionsDE',
    'strInstructionsZH-HANS', 'strInstructionsZH-HANT'];

test('rebuilding the cocktail DB drops unused languages and keeps curated Turkish text', () => {
    const existing = [{ idDrink: '1', strDrink: 'Old', strInstructions: 'old', strInstructionsTR: 'Elle düzeltilmiş tarif.' },
        { idDrink: '9', strDrink: 'Local only', strInstructionsTR: 'Yerel.' }];
    const api = [{ idDrink: '1', strDrink: 'New', strInstructions: 'Shake.', strInstructionsTR: 'API çevirisi',
        strInstructionsIT: 'Agitare', strInstructionsFR: 'Secouer', strInstructionsES: 'Agitar', strInstructionsDE: 'Schütteln',
        'strInstructionsZH-HANS': 'x', 'strInstructionsZH-HANT': 'y', strIngredient1: 'Gin', strMeasure1: '4 cl' },
        { idDrink: '2', strDrink: 'Fresh', strInstructions: 'Stir.' }];
    const merged = mergeDrinks(existing, api);
    const byId = Object.fromEntries(merged.map(d => [d.idDrink, d]));
    assert.equal(byId['1'].strDrink, 'New');
    assert.equal(byId['1'].strInstructionsTR, 'Elle düzeltilmiş tarif.');
    assert.equal(byId['1'].strIngredient1, 'Gin');
    for (const field of UNUSED) assert.ok(!(field in byId['1']), field);
    assert.equal(byId['2'].strInstructionsTR, null);
    assert.equal(byId['9'].strInstructionsTR, 'Yerel.');
    for (const drink of merged.filter(d => d.idDrink !== '9')) {
        assert.deepEqual(Object.keys(drink), [...KEPT_FIELDS, 'strInstructionsTR']);
    }
});

test('re-merging the committed database with itself is a no-op', () => {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(raw);
    for (const drink of db) for (const field of UNUSED) assert.ok(!(field in drink), `${drink.idDrink} ${field}`);
    assert.deepEqual(mergeDrinks(db, db), db);
});
