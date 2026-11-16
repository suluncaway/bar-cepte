// scripts/build-cocktails-db.js
// Fetches TheCocktailDB and refreshes cocktails.json.
// Only the fields the app uses are kept (no IT/FR/ES/DE/ZH instruction variants), and the
// hand-curated Turkish instructions (strInstructionsTR) already in cocktails.json are preserved.
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'cocktails.json');
const BASE_FIELDS = [
    'idDrink', 'strDrink', 'strDrinkAlternate', 'strTags', 'strVideo', 'strCategory', 'strIBA',
    'strAlcoholic', 'strGlass', 'strInstructions', 'strDrinkThumb'
];
const TAIL_FIELDS = ['strImageSource', 'strImageAttribution', 'strCreativeCommonsConfirmed', 'dateModified'];
const KEPT_FIELDS = [
    ...BASE_FIELDS,
    ...Array.from({ length: 15 }, (_, i) => `strIngredient${i + 1}`),
    ...Array.from({ length: 15 }, (_, i) => `strMeasure${i + 1}`),
    ...TAIL_FIELDS
];

/** Keep only the fields the app reads, in a stable order. */
function pickFields(drink) {
    const out = {};
    for (const field of KEPT_FIELDS) out[field] = drink[field] === undefined ? null : drink[field];
    return out;
}

/**
 * Merge freshly downloaded drinks with the existing database.
 * - Unused API fields (other-language instructions etc.) are dropped.
 * - Existing strInstructionsTR is always kept; the API never overwrites it.
 * - Drinks that disappeared from the API but exist locally are kept as they are.
 */
function mergeDrinks(existing, downloaded) {
    const previous = new Map((Array.isArray(existing) ? existing : [])
        .filter(d => d && d.idDrink).map(d => [String(d.idDrink), d]));
    const merged = new Map();
    for (const drink of downloaded) {
        if (!drink || !drink.idDrink) continue;
        const id = String(drink.idDrink);
        const next = pickFields(drink);
        const old = previous.get(id);
        if (old && typeof old.strInstructionsTR === 'string' && old.strInstructionsTR.trim()) {
            next.strInstructionsTR = old.strInstructionsTR;
        } else {
            next.strInstructionsTR = null;
        }
        merged.set(id, next);
    }
    for (const [id, old] of previous) if (!merged.has(id)) merged.set(id, old);
    return Array.from(merged.values());
}

async function downloadAllCocktails() {
    console.log('Downloading cocktail database...');
    const letters = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    const allDrinks = [];
    const chunkSize = 5;

    for (let i = 0; i < letters.length; i += chunkSize) {
        const chunk = letters.slice(i, i + chunkSize);
        process.stdout.write(`Fetching letters: ${chunk.join(', ')}... `);

        const promises = chunk.map(async (letter) => {
            try {
                const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.drinks || [];
            } catch (err) {
                console.error(`\nError fetching ${letter}:`, err.message);
                return [];
            }
        });

        const results = await Promise.all(promises);
        let count = 0;
        results.forEach(list => {
            allDrinks.push(...list);
            count += list.length;
        });
        console.log(`+${count} drinks`);
        await new Promise(r => setTimeout(r, 100));
    }

    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')); } catch { existing = []; }
    const drinks = mergeDrinks(existing, allDrinks);
    console.log(`Total unique drinks: ${drinks.length}`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(drinks, null, 2), 'utf-8');
    console.log(`Saved successfully to ${OUTPUT_PATH} (${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
    downloadAllCocktails().catch(err => {
        console.error('Failed to build cocktails database:', err);
        process.exit(1);
    });
}

module.exports = { mergeDrinks, pickFields, KEPT_FIELDS };
