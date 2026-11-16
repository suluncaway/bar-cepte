// Static checks for generated recipe/guide pages, recipe data, landing/privacy pages and the Android wrapper.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('recipe data has Turkish fixes and no unused instruction languages', () => {
    const drinks = JSON.parse(read('cocktails.json'));
    for (const drink of drinks) {
        for (const lang of ['ES', 'DE', 'FR', 'IT', 'ZH-HANS', 'ZH-HANT']) assert.equal(`strInstructions${lang}` in drink, false);
        assert.doesNotMatch(drink.strInstructionsTR || '', /sarhoş|Kirby|[Tt]uruncu bük|Sweeten while hot/);
        assert.doesNotMatch(drink.strInstructions || '', /get drunk|Thanks, Kirby/);
    }
    const thai = drinks.find(d => d.strDrink === 'Thai Iced Coffee');
    assert.notEqual(thai.strMeasure1, 'black');
    assert.doesNotMatch(String(thai.strMeasure3 || ''), /pods/);
});

test('generated pages: strength wording, measures, related lists, other guides, sitemap', () => {
    const oldFashioned = read('tarif/old-fashioned.html');
    assert.match(oldFashioned, /sert, içki ağırlıklı bir içecektir/);
    assert.match(oldFashioned, /Portakal kabuğu/);
    const all = fs.readdirSync(path.join(__dirname, '..', 'tarif')).filter(f => f.endsWith('.html') && f !== 'index.html')
        .map(f => [f, read('tarif/' + f)]);
    for (const [file, html] of all) {
        assert.doesNotMatch(html, /hafif ve uzun içimli bir içimdir|bir içimdir/, file);
        assert.doesNotMatch(html, /<b>[^<]*\bshots\b[^<]*<\/b>|Kahve siyah|Krema pods/, file);
        const related = html.split(/ile diğer tarifler<\/h2>/)[1] || '';
        assert.doesNotMatch(related, /fuzzy-asshole|royal-bitch|dirty-nipple|\/tarif\/orgasm\.html/, file);
    }
    // Creamy drinks served in a cocktail glass are not called long drinks.
    for (const slug of ['grasshopper', 'alexander']) {
        const file = path.join(__dirname, '..', 'tarif', slug + '.html');
        if (fs.existsSync(file)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /hafif ve uzun içimli/, slug);
    }
    for (const guide of fs.readdirSync(path.join(__dirname, '..', 'rehber')).filter(f => f !== 'index.html')) {
        const tail = (read('rehber/' + guide).split('<h2>Diğer rehberler</h2>')[1] || '').split('</ul>')[0];
        assert.ok(tail, guide);
        assert.doesNotMatch(tail, new RegExp(`href="/rehber/${guide.replace('.', '\\.')}"`), guide);
    }
    const sitemap = read('sitemap.xml');
    const urls = sitemap.match(/<url>[\s\S]*?<\/url>/g);
    assert.ok(urls.every(u => /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(u)));
    assert.match(sitemap, /<loc>https:\/\/barcepte\.com\.tr\/landing\.html<\/loc>/);
    assert.match(read('hakkimizda.html'), /TheCocktailDB/);
});

test('landing page is honest and accessible', () => {
    const html = read('landing.html');
    assert.match(html, /<link rel="canonical" href="https:\/\/barcepte\.com\.tr\/landing\.html">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/barcepte\.com\.tr\/landing\.html">/);
    assert.match(html, /440<span>\+<\/span>/);
    assert.doesNotMatch(html, /<blockquote>|speakeasy|Özel seçkiler/i);
    assert.match(html, /readonly tabindex="-1"/);
    assert.match(html, /Kullanım Koşulları/);
    assert.match(html, /18 yaş/);
    assert.doesNotMatch(html, /<span>[◎⊞⌁◫]<\/span>|<div class="line-icon">/);
    assert.doesNotMatch(read('landing.css'), /\.site-header nav\{display:none\}/);
});

test('privacy notice covers the real data flows and links the static pages', () => {
    const html = read('privacy.html');
    assert.match(html, /<meta name="description"/);
    for (const term of ['Google', 'Render', 'Neon', 'Resend', 'OpenAI', 'AdSense', 'Start.io', 'AD_ID', 'Shopier', 'yurt dışına', 'm. 11', 'barcepte@gmail.com', 'açık rıza']) {
        assert.ok(html.includes(term), term);
    }
    assert.match(html, /kullanim-kosullari\.html/);
    // Retention wording follows scripts/rate-limit.js (IPv6 /64, timed deletion) and allowBackup=false.
    assert.match(html, /IPv6'da yalnızca ilk 64 bitlik öneki/);
    assert.match(html, /son hatalı denemeden en geç 24 saat sonra otomatik silinir/);
    assert.match(html, /Android uygulaması verilerini Android\/Google cihaz yedeğine dahil etmez/);
    assert.match(html, /excludes its data from Android\/Google device backup/);
    assert.match(read('privacy.js'), /privacy-content-en/);
});

test('Android wrapper honours Reserve, clears migration history, exports files and limits external schemes', () => {
    const activity = read('android/app/src/main/java/com/barcepte/app/MainActivity.java');
    assert.match(activity, /@JavascriptInterface\s+public void setReserveActive\(boolean active\)/);
    assert.match(activity, /putBoolean\(PREF_RESERVE_ACTIVE, active\)/);
    assert.match(activity, /if \(BuildConfig\.DEBUG \|\| reserveActive\) return;/);
    assert.match(activity, /clearHistoryAfterLoad = true;/);
    assert.match(activity, /view\.clearHistory\(\)/);
    assert.match(activity, /setDownloadListener/);
    assert.match(activity, /public void saveDataUrl\(String dataUrl, String fileName\)/);
    assert.match(activity, /"http"\.equals\(scheme\) && !"https"\.equals\(scheme\) && !"mailto"\.equals\(scheme\) && !"tel"\.equals\(scheme\)/);
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    assert.match(manifest, /android:allowBackup="false"/);
    assert.match(manifest, /androidx\.core\.content\.FileProvider/);
    assert.match(read('android/app/src/main/res/xml/export_paths.xml'), /cache-path name="exports" path="exports\/"/);
    // The bridge only acts for the bundled app page; exports are typed and short-lived.
    assert.match(activity, /APP_ORIGIN = "https:\/\/appassets\.androidplatform\.net"/);
    assert.match(activity, /WebViewCompat\.addWebMessageListener\(webView, NATIVE_CHANNEL, Collections\.singleton\(APP_ORIGIN\)/);
    assert.match(activity, /if \(!isMainFrame \|\| sourceOrigin == null \|\| !APP_ORIGIN\.equals\(sourceOrigin\.toString\(\)\)\) return;/);
    // With the origin-restricted channel set up, the older bridge cannot change the Reserve state.
    assert.match(activity, /public void setReserveActive\(boolean active\) \{\s+if \(nativeChannelReady \|\| reserveActive == active\) return;\s+if \(!callerIsApp\(\)\) return;/);
    assert.match(activity, /"setReserveActive"\.equals\(type\)\) \{\s+applyReserveState\(json\.optBoolean\("active"\)\);/);
    assert.match(activity, /if \(nativeChannelReady \|\| !callerIsApp\(\)\) return;/);
    assert.match(activity, /runOnUiThread\(\(\) -> \{\s+try \{\s+url\.set\(webView\.getUrl\(\)\);/);
    const extensions = activity.match(/private static String exportExtension\(String mime\) \{([\s\S]*?)\n    \}/)[1];
    assert.deepEqual([...extensions.matchAll(/"([a-z]+\/[a-z]+)"\.equals\(mime\)\) return "(\.[a-z]+)"/g)].map(m => m[1] + m[2]),
        ['image/png.png', 'image/jpeg.jpg', 'text/csv.csv', 'application/json.json']);
    assert.match(activity, /if \(extension == null\) \{/);
    assert.doesNotMatch(activity, /"\.bin"|application\/octet-stream/);
    assert.match(activity, /String name = base \+ extension;/);
    assert.match(activity, /EXPORT_MAX_AGE_MS = 24L \* 60 \* 60 \* 1000/);
    assert.match(activity, /new Thread\(this::deleteOldExports/);
    // reserve.js reports the state through BarCepteNative when present, else through the older bridge.
    const reserveJs = read('reserve.js');
    assert.match(reserveJs, /channel\.postMessage\(JSON\.stringify\(\{ type: 'setReserveActive', active: Boolean\(active\) \}\)\); return;/);
    assert.match(reserveJs, /AndroidBridge\.setReserveActive\(Boolean\(active\)\)/);
});
