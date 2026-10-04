// scripts/build-cocktails-db.js
// Fetches the entire TheCocktailDB database and saves it as cocktails.json
const fs = require('fs');
const path = require('path');

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

    const uniqueMap = new Map();
    allDrinks.forEach(d => {
        if (d && d.idDrink) {
            uniqueMap.set(d.idDrink, d);
        }
    });

    const uniqueDrinks = Array.from(uniqueMap.values());
    console.log(`Total unique drinks: ${uniqueDrinks.length}`);

    const outputPath = path.join(__dirname, '..', 'cocktails.json');
    fs.writeFileSync(outputPath, JSON.stringify(uniqueDrinks, null, 2), 'utf-8');
    console.log(`Saved successfully to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

downloadAllCocktails().catch(err => {
    console.error('Failed to build cocktails database:', err);
    process.exit(1);
});
