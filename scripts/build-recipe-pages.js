'use strict';
// Builds one static, crawlable page per recipe (tarif/<slug>.html), an index page,
// and the recipe URLs in sitemap.xml. Run: npm run build:recipes
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://barcepte.com.tr';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const TR_CHARS = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
const slugify = name => String(name).toLowerCase().replace(/[çğıöşü]/g, ch => TR_CHARS[ch])
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tarif';
const safeImage = src => /^https:\/\/www\.thecocktaildb\.com\/images\//.test(src || '') ? src : '';
// Prefer our mirrored copy (img/drinks/, see scripts/mirror-drink-images.js) when it exists.
const ownImage = src => { const name = src.split('/').pop(); return name && fs.existsSync(path.join(__dirname, '..', 'img', 'drinks', name)) ? `${SITE}/img/drinks/${name}` : src; };

// Turkish names come from the app's own tables in game.js, so pages and app agree.
const game = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const literal = name => { const start = game.indexOf(`const ${name} = `) + `const ${name} = `.length; return new Function(`return ${game.slice(start, game.indexOf('\n};', start) + 2).replace(/\n\];$/, ']')}`)(); };
const arrayLiteral = name => { const start = game.indexOf(`const ${name} = [`) + `const ${name} = `.length; return new Function(`return ${game.slice(start, game.indexOf('\n];', start) + 2)}`)(); };
const ING_TR = literal('ingredientTranslations');
const GLASS_TR = literal('glassTranslations');
const BASE = arrayLiteral('baseIngredients');
const noEmoji = text => String(text).replace(/^[^\p{L}\p{N}(]+/u, '').trim();
const ingredientTr = name => ING_TR[name.toLowerCase()] || BASE.find(b => b.id.toLowerCase() === name.toLowerCase())?.name || name;
const glassTr = glass => glass ? noEmoji(GLASS_TR[glass.toLowerCase()] || glass) : '';
const CATEGORY_TR = { 'Ordinary Drink': 'Klasik kokteyl', Cocktail: 'Kokteyl', Shot: 'Shot', 'Punch / Party Drink': 'Parti içkisi', 'Other / Unknown': 'Diğer',
    'Coffee / Tea': 'Kahve / çay', Shake: 'Shake', Beer: 'Bira', 'Soft Drink': 'Alkolsüz içecek', 'Homemade Liqueur': 'Ev yapımı likör', Cocoa: 'Kakao' };
// oz → cl, the way the app shows measures (1 oz ≈ 3 cl)
const measureTr = measure => measure.replace(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(?:fl\s*)?(?:oz|ounces?)\b/gi, (m, n) => {
    const v = n.includes('/') ? n.trim().split(/\s+/).reduce((s, p) => s + (p.includes('/') ? p.split('/')[0] / p.split('/')[1] : +p), 0) : +n;
    return `${Math.round(v * 3 * 10) / 10} cl`;
});

function ingredients(drink) {
    const rows = [];
    for (let i = 1; i <= 15; i++) {
        const name = (drink[`strIngredient${i}`] || '').trim();
        if (name) rows.push({ name: ingredientTr(name), measure: measureTr((drink[`strMeasure${i}`] || '').trim()) });
    }
    return rows;
}

const STYLE = `body{margin:0;background:#050505;color:#f7f4f0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 20px 60px}a{color:#ff9d4d}
img{width:100%;max-width:420px;aspect-ratio:1;object-fit:cover;border-radius:20px;background:#141414;display:block;margin:20px 0}
h1{font-size:34px;line-height:1.1;margin:8px 0}.meta{color:#a8a29a}ul{padding-left:20px}
.cta{display:inline-block;margin-top:24px;padding:12px 22px;border-radius:999px;background:#ff7a1a;color:#1a0f05;font-weight:700;text-decoration:none}
.list a{display:inline-block;margin:4px 10px 4px 0}`;

function page({ title, description, canonical, body, jsonLd, image }) {
    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' https://www.thecocktaildb.com; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image || `${SITE}/og-image.jpg`)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<style>${STYLE}</style></head><body><main>${body}</main></body></html>
`;
}

function build({ root = path.join(__dirname, '..'), drinks } = {}) {
    drinks = drinks || JSON.parse(fs.readFileSync(path.join(root, 'cocktails.json'), 'utf8'));
    const outDir = path.join(root, 'tarif');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    const used = new Set(), entries = [];
    for (const drink of drinks) {
        if (!drink || !drink.idDrink || !drink.strDrink) continue;
        let slug = slugify(drink.strDrink);
        if (used.has(slug)) slug = `${slug}-${slugify(drink.idDrink)}`;
        used.add(slug);
        const url = `${SITE}/tarif/${slug}.html`, image = ownImage(safeImage(drink.strDrinkThumb)), rows = ingredients(drink);
        const title = `${drink.strDrink} Tarifi — Malzemeler ve Yapılışı | Bar Cepte`;
        const description = `${drink.strDrink} nasıl yapılır? ${rows.length} malzeme: ${rows.map(r => r.name).join(', ')}.`;
        const category = CATEGORY_TR[drink.strCategory] || drink.strCategory;
        const alcohol = /non/i.test(drink.strAlcoholic || '') ? 'Alkolsüz' : drink.strAlcoholic ? 'Alkollü' : '';
        const instructions = drink.strInstructionsTR || drink.strInstructions || '';
        const body = `<p><a href="/">← Bar Cepte</a></p>
<h1>${esc(drink.strDrink)}</h1><p class="meta">${esc([category, alcohol, glassTr(drink.strGlass)].filter(Boolean).join(' · '))}</p>
${image ? `<img src="${esc(image)}" alt="${esc(drink.strDrink)}" loading="lazy">` : ''}
<h2>Malzemeler</h2><ul>${rows.map(r => `<li>${esc(r.measure ? `${r.measure} ${r.name}` : r.name)}</li>`).join('')}</ul>
<h2>Yapılışı</h2><p>${esc(instructions)}</p>
<a class="cta" href="/#tarif=${encodeURIComponent(drink.idDrink)}">Uygulamada aç, elindekilerle karşılaştır →</a>
<p class="meta"><a href="/tarif/">Tüm tarifler</a></p>`;
        const jsonLd = { '@context': 'https://schema.org', '@type': 'Recipe', name: drink.strDrink, image: image ? [image] : undefined,
            recipeCategory: category || 'Kokteyl', recipeIngredient: rows.map(r => (r.measure ? `${r.measure} ${r.name}` : r.name)),
            recipeInstructions: instructions, inLanguage: 'tr', url };
        fs.writeFileSync(path.join(outDir, `${slug}.html`), page({ title, description, canonical: url, body, jsonLd, image }));
        entries.push({ slug, name: drink.strDrink, url });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(path.join(outDir, 'index.html'), page({
        title: 'Kokteyl Tarifleri — Tüm Liste | Bar Cepte', description: `${entries.length} kokteyl tarifi: malzemeler ve yapılış.`,
        canonical: `${SITE}/tarif/`, body: `<p><a href="/">← Bar Cepte</a></p><h1>Kokteyl Tarifleri</h1><p class="meta">${entries.length} tarif</p>
<div class="list">${entries.map(e => `<a href="/tarif/${e.slug}.html">${esc(e.name)}</a>`).join('')}</div>`
    }));
    // sitemap: keep the non-recipe entries, then list the recipe pages
    const sitemapPath = path.join(root, 'sitemap.xml');
    const kept = (fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '').match(/<url>[\s\S]*?<\/url>/g)?.filter(u => !u.includes('/tarif/')) || [];
    const recipeUrls = [`${SITE}/tarif/`, ...entries.map(e => e.url)].map(loc => `  <url>\n    <loc>${esc(loc)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
    fs.writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...kept.map(u => '  ' + u.trim()), ...recipeUrls].join('\n')}\n</urlset>\n`);
    return entries;
}

if (require.main === module) console.log(`${build().length} recipe pages written to tarif/`);
module.exports = { build, slugify, esc };
