// Downloads every TheCocktailDB drink photo (350px "medium" size) into img/drinks/ and every
// ingredient icon into img/ingredients/, so the app keeps working if that host disappears.
// Skips files already present.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'img', 'drinks');
const PREFIX = 'https://www.thecocktaildb.com/images/media/drink/';

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    const drinks = JSON.parse(fs.readFileSync(path.join(root, 'cocktails.json'), 'utf8'));
    const list = Array.isArray(drinks) ? drinks : drinks.drinks || [];
    const names = [...new Set(list.map(d => d.strDrinkThumb || '').filter(u => u.startsWith(PREFIX))
        .map(u => u.slice(PREFIX.length)).filter(n => /^[\w.-]+\.(jpg|jpeg|png)$/i.test(n)))];
    let saved = 0, failed = 0;
    for (const name of names) {
        const file = path.join(outDir, name);
        if (fs.existsSync(file)) continue;
        try {
            const res = await fetch(`${PREFIX}${name}/medium`);
            if (!res.ok) throw new Error(res.status);
            fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
            saved++;
        } catch (err) {
            failed++;
            console.warn(`failed ${name}: ${err.message}`);
        }
    }
    console.log(`${names.length} photos, ${saved} downloaded, ${failed} failed`);

    // Ingredient icons: the app's base list (game.js) plus every ingredient used in a recipe.
    const iconDir = path.join(root, 'img', 'ingredients');
    fs.mkdirSync(iconDir, { recursive: true });
    const base = [...fs.readFileSync(path.join(root, 'game.js'), 'utf8').matchAll(/\{ id: "([^"]+)"/g)].map(m => m[1]);
    const used = list.flatMap(d => Array.from({ length: 15 }, (_, i) => (d[`strIngredient${i + 1}`] || '').trim()));
    const ids = [...new Set([...base, ...used])].filter(id => id && !/[\/\\]/.test(id));
    let icons = 0, missing = 0;
    for (const id of ids) {
        const file = path.join(iconDir, `${id}-Small.png`);
        if (fs.existsSync(file)) continue;
        try {
            const res = await fetch(`https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(id)}-Small.png`);
            if (!res.ok) throw new Error(res.status);
            fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
            icons++;
        } catch { missing++; }
    }
    console.log(`${ids.length} ingredient icons, ${icons} downloaded, ${missing} missing`);
}

main();
