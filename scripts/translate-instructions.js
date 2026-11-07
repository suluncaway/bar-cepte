'use strict';
// Fills strInstructionsTR in cocktails.json using the app's own translateToTurkish
// (same glossary and clean-up the app applies at runtime), so recipes are Turkish
// offline and on the static recipe pages. Resumable: only missing entries are translated.
// Run: NODE_USE_ENV_PROXY=1 node scripts/translate-instructions.js
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const grab = name => {
    const start = game.indexOf(`function ${name}(`) >= 0 ? game.lastIndexOf('\n', game.indexOf(`function ${name}(`)) + 1 : -1;
    if (start < 0) throw new Error(`${name} not found in game.js`);
    let depth = 0, i = game.indexOf('{', start);
    for (; i < game.length; i++) { if (game[i] === '{') depth++; else if (game[i] === '}' && --depth === 0) break; }
    return game.slice(start, i + 1);
};
const { translateToTurkish } = new Function(
    [grab('cleanInstructionText'), grab('convertOzToCl'), grab('translateToTurkish'), 'return { translateToTurkish };'].join('\n'))();

const looksTurkish = text => /[çğıöşüÇĞİÖŞÜ]|\b(ve|ile|bir|bardağa|karıştırın|ekleyin|servis)\b/i.test(text);

async function main() {
    const file = path.join(root, 'cocktails.json');
    const drinks = JSON.parse(fs.readFileSync(file, 'utf8'));
    let done = 0, failed = [];
    for (const drink of drinks) {
        if (drink.strInstructionsTR || !drink.strInstructions) continue;
        let tr = '';
        for (let attempt = 0; attempt < 3 && !looksTurkish(tr); attempt++) {
            tr = await translateToTurkish(drink.strInstructions);
            if (!looksTurkish(tr)) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
        if (looksTurkish(tr)) { drink.strInstructionsTR = tr; done++; } else failed.push(drink.strDrink);
        if (done % 25 === 0) fs.writeFileSync(file, JSON.stringify(drinks));
        await new Promise(r => setTimeout(r, 250));
    }
    fs.writeFileSync(file, JSON.stringify(drinks));
    console.log(`translated ${done}; missing ${drinks.filter(d => d.strInstructions && !d.strInstructionsTR).length}`);
    if (failed.length) console.log('failed:', failed.join(', '));
}
main();
