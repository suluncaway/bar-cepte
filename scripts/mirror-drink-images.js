// Downloads every TheCocktailDB drink photo (350px "medium" size) into img/drinks/
// so the site keeps working if that host disappears. Skips files already present.
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
}

main();
