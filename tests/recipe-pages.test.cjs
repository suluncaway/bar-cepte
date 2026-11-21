const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { build, slugify } = require('../scripts/build-recipe-pages');

test('recipe pages are escaped, uniquely named and listed in the sitemap', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-pages-'));
    fs.writeFileSync(path.join(root, 'sitemap.xml'), '<urlset><url><loc>https://barcepte.com.tr/</loc></url></urlset>');
    const drinks = [
        { idDrink: '1', strDrink: 'Piña <script>alert(1)</script>', strInstructions: 'Mix & "serve"', strIngredient1: 'Rum', strMeasure1: '4 cl', strDrinkThumb: 'javascript:alert(1)' },
        { idDrink: '2', strDrink: 'Piña <script>alert(1)</script>' },
        { idDrink: '3', strDrink: 'Çilekli Şeftali' }
    ];
    const entries = build({ root, drinks });
    assert.deepEqual(entries.map(e => e.slug).sort(), ['cilekli-seftali', 'pina-script-alert-1-script', 'pina-script-alert-1-script-2']);
    const html = fs.readFileSync(path.join(root, 'tarif', 'pina-script-alert-1-script.html'), 'utf8');
    assert.ok(!html.includes('<script>alert'), 'names are escaped');
    assert.ok(!html.includes('javascript:'), 'unsafe images are dropped');
    assert.match(html, /Mix &amp; &quot;serve&quot;/);
    assert.match(html, /href="\/#tarif=1"/);
    const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /<loc>https:\/\/barcepte.com.tr\/<\/loc>/, 'existing entries are kept');
    assert.equal((sitemap.match(/\/tarif\//g) || []).length, 5, 'index, 3 recipes and the rum category');
    assert.match(sitemap, /\/rehber\/evde-bar-kurmak\.html/);
    assert.match(sitemap, /\/hakkimizda\.html/);
    assert.ok(fs.existsSync(path.join(root, 'tarif', 'kategori', 'rom.html')));
    assert.ok(fs.existsSync(path.join(root, 'iletisim.html')));
    assert.match(html, /hakkında<\/h2>/);
    assert.match(html, /"@type":"HowToStep"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.ok(fs.existsSync(path.join(root, '404.html')));
    assert.match(html, /\/kullanim-kosullari\.html/, 'footer links the terms page');
    assert.equal(slugify('Mojito'), 'mojito');

    // Validate Recipe JSON-LD structured data fields (GSC requirements)
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ldMatch, 'JSON-LD script tag exists');
    const parsed = JSON.parse(ldMatch[1]);
    const recipe = Array.isArray(parsed) ? parsed.find(x => x['@type'] === 'Recipe') : parsed;
    assert.ok(recipe, 'Recipe schema object exists');
    assert.equal(recipe.author?.['@type'], 'Organization');
    assert.equal(recipe.author?.name, 'Bar Cepte');
    assert.equal(recipe.recipeCuisine, 'Uluslararası');
    assert.ok(typeof recipe.keywords === 'string' && recipe.keywords.trim().length > 0, 'keywords present');
    assert.ok(typeof recipe.description === 'string' && recipe.description.trim().length > 0, 'description present');
    assert.match(recipe.prepTime, /^PT\d+M$/, 'prepTime is valid ISO 8601 duration');
    assert.match(recipe.cookTime, /^PT\d+M$/, 'cookTime is valid ISO 8601 duration');
    assert.match(recipe.totalTime, /^PT\d+M$/, 'totalTime is valid ISO 8601 duration');
    assert.equal(recipe.nutrition?.['@type'], 'NutritionInformation');
    assert.match(recipe.nutrition?.calories, /^\d+ calories$/, 'nutrition calories formatted');
    assert.equal(recipe.aggregateRating?.['@type'], 'AggregateRating');
    assert.ok(typeof recipe.aggregateRating?.ratingValue === 'number' && recipe.aggregateRating.ratingValue >= 1 && recipe.aggregateRating.ratingValue <= 5, 'valid ratingValue');
    assert.ok(Number.isInteger(recipe.aggregateRating?.ratingCount) && recipe.aggregateRating.ratingCount > 0, 'valid ratingCount');
    assert.equal(recipe.aggregateRating?.bestRating, 5);
    assert.equal(recipe.aggregateRating?.worstRating, 1);

    fs.rmSync(root, { recursive: true, force: true });
});
