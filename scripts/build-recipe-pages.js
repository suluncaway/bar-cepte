'use strict';
// Builds one static, crawlable page per recipe (tarif/<slug>.html), an index page,
// and the recipe URLs in sitemap.xml. Run: npm run build:recipes
const fs = require('node:fs');
const { INFO_PAGES, CATEGORIES, GUIDES, TIPS } = require('./site-content');
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
const MEASURE_TR = literal('measureTranslations');
const MEASURE_KEYS = Object.keys(MEASURE_TR).sort((a, b) => b.length - a.length);
const noEmoji = text => String(text).replace(/^[^\p{L}\p{N}(]+/u, '').trim();
const ingredientTr = name => ING_TR[name.toLowerCase()] || BASE.find(b => b.id.toLowerCase() === name.toLowerCase())?.name || name;
const glassTr = glass => glass ? noEmoji(GLASS_TR[glass.toLowerCase()] || glass) : '';
const CATEGORY_TR = { 'Ordinary Drink': 'Klasik kokteyl', Cocktail: 'Kokteyl', Shot: 'Shot', 'Punch / Party Drink': 'Parti içkisi', 'Other / Unknown': 'Diğer',
    'Coffee / Tea': 'Kahve / çay', Shake: 'Shake', Beer: 'Bira', 'Soft Drink': 'Alkolsüz içecek', 'Homemade Liqueur': 'Ev yapımı likör', Cocoa: 'Kakao' };
// oz → cl, the way the app shows measures (1 oz ≈ 3 cl)
const measureTr = measure => measure.replace(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(?:fl\s*)?(?:oz|ounces?)\b/gi, (m, n) => {
    const v = n.includes('/') ? n.trim().split(/\s+/).reduce((s, p) => s + (p.includes('/') ? p.split('/')[0] / p.split('/')[1] : +p), 0) : +n;
    return `${Math.round(v * 3 * 10) / 10} cl`;
}).replace(new RegExp(`\\b(${MEASURE_KEYS.join('|')})\\b`, 'gi'), word => MEASURE_TR[word.toLowerCase()] ?? word);
// "6 cl Viski", but "Limon suyu: 1/2" when the measure starts with a word.
const rowText = r => !r.measure ? r.name : /^[\d½¼¾]/.test(r.measure) ? `${r.measure} ${r.name}` : `${r.name} ${r.measure}`;

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
.list a{display:inline-block;margin:4px 10px 4px 0}
.site{max-width:720px;margin:0 auto;padding:14px 20px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between}
header.site{border-bottom:1px solid #222}header.site nav{display:flex;flex-wrap:wrap;gap:6px 16px}.brand{font-weight:800;color:#f7f4f0;text-decoration:none}
footer.site{display:block;border-top:1px solid #222;color:#a8a29a;font-size:13px;padding:24px 20px 40px}
.about{background:#121212;border:1px solid #222;border-radius:16px;padding:4px 18px;margin:24px 0}dt{font-weight:700;margin-top:14px}dd{margin:4px 0 0}`;

// AdSense runs only on content pages (recipes, categories, guides), never on the app's empty/gate screens.
const AD_CLIENT = 'ca-pub-1804104950968329', AD_SLOT = '9651225274';
const AD_HEAD = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>`;
const AD_UNIT = `<ins class="adsbygoogle" style="display:block;margin:24px 0" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins><script src="/ads.js"></script>`;
const CSP = "default-src 'self'; img-src 'self' https://www.thecocktaildb.com; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'";
const AD_CSP = "default-src 'self'; img-src 'self' data: https:; style-src 'unsafe-inline'; script-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://*.google.com https://*.gstatic.com; frame-src https:; connect-src https:; base-uri 'none'; form-action 'none'";
const NAV = `<header class="site"><a class="brand" href="/">🍸 Bar Cepte</a><nav><a href="/tarif/">Tarifler</a><a href="/rehber/">Rehberler</a><a href="/hakkimizda.html">Hakkımızda</a><a href="/">Uygulamayı aç</a></nav></header>`;
const FOOTER = `<footer class="site"><p>Bu sitedeki alkollü içecek tarifleri yalnızca 18 yaş ve üzeri yetişkinler içindir. Bar Cepte alkollü içki satışı yapmaz. Alkolü ölçülü tüketin; alkol aldıysanız araç kullanmayın.</p>
<p><a href="/hakkimizda.html">Hakkımızda</a> · <a href="/iletisim.html">İletişim</a> · <a href="/privacy.html">Gizlilik Politikası</a> · <a href="/kullanim-kosullari.html">Kullanım Koşulları</a> · <a href="/rehber/sorumlu-tuketim.html">Sorumlu Tüketim</a></p><p>© 2026 Bar Cepte</p></footer>`;

function page({ title, description, canonical, body, jsonLd, image, ads }) {
    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${ads ? AD_CSP : CSP}">${ads ? AD_HEAD : ''}
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image || `${SITE}/og-image.jpg`)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<style>${STYLE}</style></head><body>${NAV}<main>${body}</main>${FOOTER}</body></html>
`;
}

const ingredientText = drink => Array.from({ length: 15 }, (_, i) => drink[`strIngredient${i + 1}`] || '').join(' ').toLowerCase();
const isAlcoholFree = drink => /non/i.test(drink.strAlcoholic || '');

// A short, data-driven "about this recipe" section so every page says something of its own.
function aboutRecipe(drink, rows, cats) {
    const en = (drink.strInstructions || '').toLowerCase();
    const technique = /blend/.test(en) ? 'blend' : /shake|shaker/.test(en) ? 'shake' : /\bstir/.test(en) ? 'stir' : /muddle|crush/.test(en) ? 'muddle' : 'build';
    const level = rows.length <= 3 ? 'kolay' : rows.length <= 5 ? 'orta zorlukta' : 'biraz daha emek isteyen';
    const kind = isAlcoholFree(drink) ? 'alkolsüz bir içecek' : (CATEGORY_TR[drink.strCategory] || 'kokteyl').toLocaleLowerCase('tr');
    const howTo = {
        shake: 'Malzemeler buzla birlikte shaker’da çalkalanarak hazırlanır; çalkalama içeceği hızla soğutur ve hafif köpüklü bir doku verir.',
        stir: 'Malzemeler buzla karıştırılarak hazırlanır; bu yöntem içeceği berrak ve ipeksi tutar.',
        blend: 'Malzemeler buzla birlikte blender’da çekilerek hazırlanan, buzlu ve yoğun kıvamlı bir içecektir.',
        muddle: 'Malzemelerin bir kısmı bardağın dibinde ezilerek aroması çıkarılır, ardından diğer malzemeler eklenir.',
        build: 'Malzemeler doğrudan servis bardağına, buz üzerine dökülerek hazırlanır; ek ekipman gerektirmez.'
    }[technique];
    const glass = glassTr(drink.strGlass);
    const parts = [
        `<p>${esc(drink.strDrink)}, ${rows.length} malzemeyle hazırlanan ${level} bir ${esc(kind)} tarifidir. ${howTo} Teknikler hakkında daha fazlası için <a href="/rehber/calkalama-mi-karistirma-mi.html">Çalkalama mı Karıştırma mı?</a> rehberine göz atabilirsin.</p>`,
        glass ? `<p>Geleneksel olarak <strong>${esc(glass)}</strong> içinde servis edilir. Bardak seçiminin içeceğe etkisini <a href="/rehber/kokteyl-bardaklari.html">Kokteyl Bardakları</a> rehberinde anlattık.</p>` : '',
        cats.length ? `<p>Bu tarif ${cats.map(c => `<a href="/tarif/kategori/${c.slug}.html">${esc(c.title)}</a>`).join(', ')} arasında yer alır.</p>` : '',
        isAlcoholFree(drink) ? '<p>Alkol içermediği için her yaştan misafire sunulabilir.</p>' : '<p>Alkollü bir içecektir; yalnızca 18 yaş ve üzeri içindir. Ölçülü tüketmeyi unutma.</p>',
        TIPS[drink.strDrink] ? `<h3>Barmen ipucu</h3><p>${esc(TIPS[drink.strDrink])}</p>` : ''
    ];
    return `<section class="about"><h2>Bu tarif hakkında</h2>${parts.join('\n')}</section>`;
}

const listItems = (items, slugs) => `<div class="list">${items.map(d => `<a href="/tarif/${slugs.get(d)}.html">${esc(d.strDrink)}</a>`).join('')}</div>`;

function build({ root = path.join(__dirname, '..'), drinks } = {}) {
    drinks = drinks || JSON.parse(fs.readFileSync(path.join(root, 'cocktails.json'), 'utf8'));
    const outDir = path.join(root, 'tarif'), catDir = path.join(outDir, 'kategori'), guideDir = path.join(root, 'rehber');
    for (const dir of [outDir, guideDir]) fs.rmSync(dir, { recursive: true, force: true });
    for (const dir of [catDir, guideDir]) fs.mkdirSync(dir, { recursive: true });
    const used = new Set(), entries = [], slugs = new Map();
    drinks = drinks.filter(drink => drink && drink.idDrink && drink.strDrink);
    for (const drink of drinks) {
        let slug = slugify(drink.strDrink);
        if (used.has(slug)) slug = `${slug}-${slugify(drink.idDrink)}`;
        used.add(slug);
        slugs.set(drink, slug);
    }
    const catsOf = new Map(drinks.map(d => [d, CATEGORIES.filter(c => c.match(d, ingredientText(d)))]));
    // Related recipes share the same first (base) ingredient.
    const base = drink => (drink.strIngredient1 || '').trim().toLowerCase();
    for (const drink of drinks) {
        const slug = slugs.get(drink);
        const related = drinks.filter(other => other !== drink && base(other) && base(other) === base(drink)).slice(0, 6);
        const url = `${SITE}/tarif/${slug}.html`, image = ownImage(safeImage(drink.strDrinkThumb)), rows = ingredients(drink);
        const title = `${drink.strDrink} Tarifi — Malzemeler ve Yapılışı | Bar Cepte`;
        const description = `${drink.strDrink} nasıl yapılır? ${rows.length} malzeme: ${rows.map(r => r.name).join(', ')}.`;
        const category = CATEGORY_TR[drink.strCategory] || drink.strCategory;
        const alcohol = isAlcoholFree(drink) ? 'Alkolsüz' : drink.strAlcoholic ? 'Alkollü' : '';
        const instructions = drink.strInstructionsTR || drink.strInstructions || '';
        const body = `<p><a href="/tarif/">← Tüm tarifler</a></p>
<h1>${esc(drink.strDrink)}</h1><p class="meta">${esc([category, alcohol, glassTr(drink.strGlass)].filter(Boolean).join(' · '))}</p>
${image ? `<img src="${esc(image)}" alt="${esc(drink.strDrink)}" loading="lazy">` : ''}
<h2>Malzemeler</h2><ul>${rows.map(r => `<li>${esc(rowText(r))}</li>`).join('')}</ul>
<h2>Yapılışı</h2><p>${esc(instructions)}</p>
${aboutRecipe(drink, rows, catsOf.get(drink))}
${AD_UNIT}
${related.length ? `<h2>${esc(rows[0]?.name || 'Benzer')} ile diğer tarifler</h2>${listItems(related, slugs)}` : ''}
<a class="cta" href="/#tarif=${encodeURIComponent(drink.idDrink)}">Uygulamada aç, elindekilerle karşılaştır →</a>`;
        const jsonLd = { '@context': 'https://schema.org', '@type': 'Recipe', name: drink.strDrink, image: image ? [image] : undefined,
            recipeCategory: category || 'Kokteyl', recipeIngredient: rows.map(rowText),
            recipeInstructions: instructions, inLanguage: 'tr', url };
        fs.writeFileSync(path.join(outDir, `${slug}.html`), page({ title, description, canonical: url, body, jsonLd, image, ads: true }));
        entries.push({ slug, name: drink.strDrink, url });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    const urls = [`${SITE}/tarif/`];
    const catLinks = CATEGORIES.map(c => `<a href="/tarif/kategori/${c.slug}.html">${esc(c.title)}</a>`).join('');
    fs.writeFileSync(path.join(outDir, 'index.html'), page({
        title: 'Kokteyl Tarifleri — Tüm Liste | Bar Cepte', description: `${entries.length} kokteyl tarifi: malzemeler ve yapılış.`,
        canonical: `${SITE}/tarif/`, body: `<h1>Kokteyl Tarifleri</h1><p class="meta">${entries.length} tarif</p>
<h2>Kategoriler</h2><div class="list">${catLinks}</div>
<h2>Tüm tarifler</h2><div class="list">${entries.map(e => `<a href="/tarif/${e.slug}.html">${esc(e.name)}</a>`).join('')}</div>`
    }));
    for (const cat of CATEGORIES) {
        const members = drinks.filter(d => catsOf.get(d).includes(cat)).sort((a, b) => a.strDrink.localeCompare(b.strDrink));
        if (!members.length) continue;
        const url = `${SITE}/tarif/kategori/${cat.slug}.html`;
        urls.push(url);
        fs.writeFileSync(path.join(catDir, `${cat.slug}.html`), page({
            title: `${cat.title} — ${members.length} Tarif | Bar Cepte`, description: `${cat.name} ile hazırlanan ${members.length} kokteyl tarifi: malzemeler, ölçüler ve yapılış.`,
            canonical: url, ads: true, body: `<p><a href="/tarif/">← Tüm tarifler</a></p><h1>${esc(cat.title)}</h1><p class="meta">${members.length} tarif</p>
${cat.intro}
${AD_UNIT}
<h2>Tarifler</h2>${listItems(members, slugs)}
<h2>Diğer kategoriler</h2><div class="list">${catLinks}</div>`
        }));
    }
    urls.push(...entries.map(e => e.url), `${SITE}/rehber/`);
    const guideLinks = GUIDES.map(g => `<li><a href="/rehber/${g.slug}.html">${esc(g.title)}</a> — ${esc(g.description)}</li>`).join('');
    fs.writeFileSync(path.join(guideDir, 'index.html'), page({
        title: 'Kokteyl Rehberleri | Bar Cepte', description: 'Evde bar kurmak, ekipmanlar, bardaklar, teknikler ve şuruplar hakkında Türkçe rehberler.',
        canonical: `${SITE}/rehber/`, body: `<h1>Kokteyl Rehberleri</h1><p>Evde kokteyl hazırlamayı öğrenmek için temel bilgiler.</p><ul>${guideLinks}</ul>`
    }));
    for (const guide of GUIDES) {
        const url = `${SITE}/rehber/${guide.slug}.html`;
        urls.push(url);
        fs.writeFileSync(path.join(guideDir, `${guide.slug}.html`), page({
            title: `${guide.title} | Bar Cepte`, description: guide.description, canonical: url, ads: true,
            jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, inLanguage: 'tr', url },
            body: `<p><a href="/rehber/">← Rehberler</a></p><h1>${esc(guide.title)}</h1>${guide.html}\n${AD_UNIT}\n<h2>Diğer rehberler</h2><ul>${guideLinks}</ul>`
        }));
    }
    for (const info of INFO_PAGES) {
        const url = `${SITE}/${info.slug}.html`;
        urls.push(url);
        fs.writeFileSync(path.join(root, `${info.slug}.html`), page({
            title: `${info.title} | Bar Cepte`, description: info.description, canonical: url, body: `<h1>${esc(info.title)}</h1>${info.html}`
        }));
    }
    // sitemap: keep entries this script does not own, then list the generated pages
    const sitemapPath = path.join(root, 'sitemap.xml');
    const owned = new Set(urls);
    const kept = (fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '').match(/<url>[\s\S]*?<\/url>/g)
        ?.filter(u => !/\/(tarif|rehber)\//.test(u) && !owned.has((u.match(/<loc>([^<]+)<\/loc>/) || [])[1])) || [];
    const generated = urls.map(loc => `  <url>\n    <loc>${esc(loc)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
    fs.writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...kept.map(u => '  ' + u.trim()), ...generated].join('\n')}\n</urlset>\n`);
    return entries;
}

if (require.main === module) console.log(`${build().length} recipe pages written to tarif/`);
module.exports = { build, slugify, esc };
