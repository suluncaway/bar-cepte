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
    assert.equal((sitemap.match(/\/tarif\//g) || []).length, 4);
    assert.equal(slugify('Mojito'), 'mojito');
    fs.rmSync(root, { recursive: true, force: true });
});
