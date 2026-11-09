'use strict';
// Builds one static, crawlable page per recipe (tarif/<slug>.html), an index page,
// and the recipe URLs in sitemap.xml. Run: npm run build:recipes
const fs = require('node:fs');
const { INFO_PAGES, CATEGORIES, GUIDES, TIPS, PRODUCTS } = require('./site-content');
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

// Same look as the app: DM Sans, near-black surfaces, orange accent, pocket logo.
const STYLE = `:root{--bg:#050505;--surface:#101010;--raised:#161616;--line:rgba(255,255,255,.12);--ink:#f2f2f2;--muted:#a3a3a3;--accent:#ff7a1a;--accent-soft:#ff9d4d}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(circle at 50% -10%,rgba(255,122,26,.14),transparent 45%) no-repeat,var(--bg);color:var(--ink);font:16px/1.75 "DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:760px;margin:0 auto;padding:28px 20px 64px}
a{color:var(--accent-soft);text-decoration:none}main p a,main li a,main dd a{border-bottom:1px solid rgba(255,157,77,.4)}a:hover{color:#ffc48a}
h1,h2,h3{font-weight:800;letter-spacing:-.03em;line-height:1.12;color:#fff}
h1{font-size:clamp(32px,8vw,48px);margin:10px 0 12px}h2{font-size:24px;margin:36px 0 10px}h3{font-size:19px;margin:24px 0 8px}
p,li,dd{color:#d6d6d6}strong{color:#fff}.meta{color:var(--muted);font-size:14px}ul{padding-left:20px}li{margin:6px 0}
.eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.18em;color:var(--accent);font-size:11px;font-weight:700;border:0!important}
img{width:100%;max-width:440px;aspect-ratio:1;object-fit:cover;border-radius:22px;background:var(--surface);display:block;margin:22px 0;border:1px solid var(--line)}
.cta{display:inline-flex;align-items:center;margin-top:28px;padding:14px 24px;border-radius:999px;background:linear-gradient(90deg,var(--accent-soft),var(--accent));color:#1a0f05!important;font-weight:800;border:0!important}
.list{display:flex;flex-wrap:wrap;gap:8px}.list a{padding:7px 13px;border:1px solid var(--line)!important;border-radius:999px;background:var(--surface);color:var(--ink);font-size:14px}.list a:hover{border-color:var(--accent)!important;color:var(--accent-soft)}
.site{max-width:1080px;margin:0 auto;padding:14px 20px;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;justify-content:space-between}
header.site-wrap{position:sticky;top:0;z-index:10;background:rgba(8,8,8,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;color:#fff;letter-spacing:-.02em}.brand svg{width:34px;height:34px;color:#d9b77d}.brand span{color:var(--accent)}
header nav{display:flex;flex-wrap:wrap;gap:6px}header nav a{padding:7px 12px;border-radius:999px;color:var(--muted);font-size:14px;font-weight:600}header nav a:hover{color:#fff;background:var(--raised)}header nav a.app{background:var(--accent);color:#1a0f05}
footer.site-wrap{border-top:1px solid var(--line);margin-top:20px;background:#080808}footer .site{display:block;color:var(--muted);font-size:13px;padding:28px 20px 44px}footer p{color:var(--muted);margin:8px 0}footer a{color:#d6d6d6}
.about,.gear,.card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:6px 22px 14px;margin:28px 0}.gear li{margin:10px 0}.small{font-size:13px;color:var(--muted)}
.guides{list-style:none;padding:0;display:grid;gap:12px}.guides li{margin:0}.guides a{display:block;padding:18px 20px;border:1px solid var(--line)!important;border-radius:18px;background:var(--surface);color:var(--ink)}.guides a b{display:block;color:#fff;font-size:18px;margin-bottom:4px}.guides a span{color:var(--muted);font-size:14px}
dl{margin:0}dt{font-weight:800;color:#fff;margin-top:18px}dd{margin:4px 0 0}
@media (max-width:520px){.site{padding:10px 16px;gap:6px}header nav{gap:2px;flex-wrap:nowrap}header nav a{padding:6px 10px;font-size:13px}header nav a.about-link{display:none}.brand{font-size:17px}.brand svg{width:30px;height:30px}main{padding:22px 16px 56px}}`;

// AdSense runs only on content pages (recipes, categories, guides), never on the app's empty/gate screens.
const AD_CLIENT = 'ca-pub-1804104950968329', AD_SLOT = '9651225274';
const AD_HEAD = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>`;
const AD_UNIT = `<ins class="adsbygoogle" style="display:block;margin:24px 0" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins><script src="/ads.js"></script>`;
const CSP = "default-src 'self'; img-src 'self' https://www.thecocktaildb.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'none'; base-uri 'none'; form-action 'none'";
const AD_CSP = "default-src 'self'; img-src 'self' data: https:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://*.google.com https://*.gstatic.com; frame-src https:; connect-src https:; base-uri 'none'; form-action 'none'";
const LOGO = '<svg viewBox="10 -2 100 134" fill="none" aria-hidden="true"><line x1="66" y1="26" x2="80" y2="4" stroke="#a5c6b3" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="27" r="7" fill="#a5c6b3"/><g stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M55 44 L30 14 H90 L65 44"/><path d="M18 44 H102 V86 Q102 112 60 124 Q18 112 18 86 Z"/></g></svg>';
const NAV = `<header class="site-wrap"><div class="site"><a class="brand" href="/">${LOGO}Bar Cepte<span>.</span></a><nav><a href="/tarif/">Tarifler</a><a href="/rehber/">Rehberler</a><a class="about-link" href="/hakkimizda.html">Hakkımızda</a><a class="app" href="/">Uygulamayı aç</a></nav></div></header>`;
const FOOTER = `<footer class="site-wrap"><div class="site"><p>Bu sitedeki alkollü içecek tarifleri yalnızca 18 yaş ve üzeri yetişkinler içindir. Bar Cepte alkollü içki satışı yapmaz. Alkolü ölçülü tüketin; alkol aldıysanız araç kullanmayın.</p>
<p>Ekipman önerilerindeki bazı bağlantılar ortaklık bağlantısıdır; bu bağlantılardan yapılan alışverişlerden Bar Cepte komisyon kazanabilir.</p>
<p><a href="/hakkimizda.html">Hakkımızda</a> · <a href="/iletisim.html">İletişim</a> · <a href="/privacy.html">Gizlilik Politikası</a> · <a href="/kullanim-kosullari.html">Kullanım Koşulları</a> · <a href="/rehber/sorumlu-tuketim.html">Sorumlu Tüketim</a></p><p>© 2026 Bar Cepte</p></div></footer>`;

function page({ title, description, canonical, body, jsonLd, image, ads }) {
    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${ads ? AD_CSP : CSP}">${ads ? AD_HEAD : ''}
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image || `${SITE}/og-image.jpg`)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap">
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

// Equipment box with affiliate links (rel=sponsored).
const gearBox = (keys, heading = 'Önerilen ekipmanlar') => {
    const items = [...new Set(keys)].map(k => PRODUCTS[k]).filter(Boolean);
    return items.length ? `<section class="gear"><h2>${esc(heading)}</h2><ul>${items.map(p => `<li><a href="${esc(p.url)}" target="_blank" rel="sponsored noopener noreferrer">${esc(p.name)}</a> — ${esc(p.note)}</li>`).join('')}</ul><p class="small">Ortaklık bağlantısı: alışveriş yaparsan Bar Cepte komisyon kazanabilir, fiyat değişmez.</p></section>` : '';
};
// Equipment a recipe needs, from its technique and glass.
function recipeGear(drink) {
    const en = (drink.strInstructions || '').toLowerCase(), glass = (drink.strGlass || '').toLowerCase(), keys = [];
    if (/shake|shaker/.test(en)) keys.push('shaker');
    if (/muddle|crush/.test(en)) keys.push('muddler');
    if (/lemon|lime/.test(ingredientText(drink))) keys.push('squeezer');
    if (/cocktail|martini|coupe|margarita|nick/.test(glass)) keys.push('coupe');
    if (/highball|collins/.test(glass)) keys.push('highball');
    if (/old-fashioned|whiskey/.test(glass)) keys.push('ice');
    return keys.slice(0, 3);
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
<span class="eyebrow">Tarif</span><h1>${esc(drink.strDrink)}</h1><p class="meta">${esc([category, alcohol, glassTr(drink.strGlass)].filter(Boolean).join(' · '))}</p>
${image ? `<img src="${esc(image)}" alt="${esc(drink.strDrink)}" loading="lazy">` : ''}
<h2>Malzemeler</h2><ul>${rows.map(r => `<li>${esc(rowText(r))}</li>`).join('')}</ul>
<h2>Yapılışı</h2><p>${esc(instructions)}</p>
${aboutRecipe(drink, rows, catsOf.get(drink))}
${gearBox(recipeGear(drink), 'Bu tarif için ekipman')}
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
        canonical: `${SITE}/tarif/`, body: `<span class="eyebrow">Tarifler</span><h1>Kokteyl Tarifleri</h1><p class="meta">${entries.length} tarif</p>
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
            canonical: url, ads: true, body: `<p><a href="/tarif/">← Tüm tarifler</a></p><span class="eyebrow">Kategori</span><h1>${esc(cat.title)}</h1><p class="meta">${members.length} tarif</p>
${cat.intro}
${AD_UNIT}
<h2>Tarifler</h2>${listItems(members, slugs)}
<h2>Diğer kategoriler</h2><div class="list">${catLinks}</div>`
        }));
    }
    urls.push(...entries.map(e => e.url), `${SITE}/rehber/`);
    const guideLinks = GUIDES.map(g => `<li><a href="/rehber/${g.slug}.html"><b>${esc(g.title)}</b><span>${esc(g.description)}</span></a></li>`).join('');
    fs.writeFileSync(path.join(guideDir, 'index.html'), page({
        title: 'Kokteyl Rehberleri | Bar Cepte', description: 'Evde bar kurmak, ekipmanlar, bardaklar, teknikler ve şuruplar hakkında Türkçe rehberler.',
        canonical: `${SITE}/rehber/`, body: `<span class="eyebrow">Rehber</span><h1>Kokteyl Rehberleri</h1><p>Evde kokteyl hazırlamayı öğrenmek için temel bilgiler.</p><ul class="guides">${guideLinks}</ul>`
    }));
    for (const guide of GUIDES) {
        const url = `${SITE}/rehber/${guide.slug}.html`;
        urls.push(url);
        fs.writeFileSync(path.join(guideDir, `${guide.slug}.html`), page({
            title: `${guide.title} | Bar Cepte`, description: guide.description, canonical: url, ads: true,
            jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, inLanguage: 'tr', url },
            body: `<p><a href="/rehber/">← Rehberler</a></p><span class="eyebrow">Rehber</span><h1>${esc(guide.title)}</h1>${guide.html}\n${gearBox(guide.products || [])}\n${AD_UNIT}\n<h2>Diğer rehberler</h2><ul class="guides">${guideLinks}</ul>`
        }));
    }
    for (const info of INFO_PAGES) {
        const url = `${SITE}/${info.slug}.html`;
        urls.push(url);
        fs.writeFileSync(path.join(root, `${info.slug}.html`), page({
            title: `${info.title} | Bar Cepte`, description: info.description, canonical: url, body: `<span class="eyebrow">Bar Cepte</span><h1>${esc(info.title)}</h1><div class="card">${info.html}</div>`
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
