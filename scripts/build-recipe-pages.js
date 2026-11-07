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

function ingredients(drink) {
    const rows = [];
    for (let i = 1; i <= 15; i++) {
        const name = (drink[`strIngredient${i}`] || '').trim();
        if (name) rows.push({ name, measure: (drink[`strMeasure${i}`] || '').trim() });
    }
    return rows;
}

const STYLE = `body{margin:0;background:#050505;color:#f7f4f0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 20px 60px}a{color:#ff9d4d}
img{width:100%;max-width:420px;aspect-ratio:1;object-fit:cover;border-radius:20px;background:#141414;display:block;margin:20px 0}
h1{font-size:34px;line-height:1.1;margin:8px 0}.meta{color:#a8a29a}ul{padding-left:20px}
.cta{display:inline-block;margin-top:24px;padding:12px 22px;border-radius:999px;background:#ff7a1a;color:#fff;font-weight:700;text-decoration:none}
.list a{display:inline-block;margin:4px 10px 4px 0}`;

function page({ title, description, canonical, body, jsonLd }) {
    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' https://www.thecocktaildb.com; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.jpg"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">
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
        const url = `${SITE}/tarif/${slug}.html`, image = safeImage(drink.strDrinkThumb), rows = ingredients(drink);
        const title = `${drink.strDrink} Tarifi — Malzemeler ve Yapılışı | Bar Cepte`;
        const description = `${drink.strDrink} nasıl yapılır? ${rows.length} malzeme: ${rows.map(r => r.name).join(', ')}.`;
        const body = `<p><a href="/">← Bar Cepte</a></p>
<h1>${esc(drink.strDrink)}</h1><p class="meta">${esc([drink.strCategory, drink.strAlcoholic, drink.strGlass].filter(Boolean).join(' · '))}</p>
${image ? `<img src="${esc(image)}" alt="${esc(drink.strDrink)}" loading="lazy">` : ''}
<h2>Malzemeler</h2><ul>${rows.map(r => `<li>${esc(r.measure ? `${r.measure} ${r.name}` : r.name)}</li>`).join('')}</ul>
<h2>Yapılışı</h2><p>${esc(drink.strInstructions || '')}</p>
<a class="cta" href="/#tarif=${encodeURIComponent(drink.idDrink)}">Uygulamada aç, elindekilerle karşılaştır →</a>
<p class="meta"><a href="/tarif/">Tüm tarifler</a></p>`;
        const jsonLd = { '@context': 'https://schema.org', '@type': 'Recipe', name: drink.strDrink, image: image ? [image] : undefined,
            recipeCategory: drink.strCategory || 'Cocktail', recipeIngredient: rows.map(r => (r.measure ? `${r.measure} ${r.name}` : r.name)),
            recipeInstructions: drink.strInstructions || '', url };
        fs.writeFileSync(path.join(outDir, `${slug}.html`), page({ title, description, canonical: url, body, jsonLd }));
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
