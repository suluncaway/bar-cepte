const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createPreviewServer } = require('../scripts/preview.cjs');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('Preview serves canonical public files and denies secrets, traversal and writes', async t => {
    const server = createPreviewServer();
    t.after(() => new Promise(resolve => server.close(resolve)));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), read('index.html'));
    for (const file of ['.env', 'keys/license-state.json', '.git/config', 'scripts/shopier-webhook.js', '%2e%2e%2fpackage.json']) {
        assert.equal((await fetch(`${base}/${file}`)).status, 404);
    }
    assert.equal((await fetch(base, { method: 'POST' })).status, 404);
    const head = await fetch(`${base}/game.js`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
});

test('Lockfile excludes vulnerable formatter and constrains the proxy override', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    assert.equal(pkg.overrides['@electron/get']['global-agent'], '4.1.3');
    assert.ok(!Object.keys(lock.packages).some(name => name.endsWith('/sprintf-js')));
    const agents = Object.entries(lock.packages).filter(([name]) => name.endsWith('/global-agent'));
    assert.ok(agents.length);
    for (const [, dependency] of agents) assert.equal(dependency.version, '4.1.3');
});

test('Electron downloader can bootstrap the updated proxy API', () => {
    const output = execFileSync(process.execPath, ['-e', `
        const { createRequire } = require('node:module');
        const builder = createRequire(require.resolve('app-builder-lib/package.json'));
        const downloader = createRequire(builder.resolve('@electron/get'));
        const proxy = downloader('global-agent');
        require('node:assert/strict').equal(typeof proxy.bootstrap, 'function');
        builder('@electron/get').initializeProxy();
        require('node:assert/strict').ok(global.GLOBAL_AGENT);
        console.log('proxy-ready');
    `], { cwd: root, encoding: 'utf8' });
    assert.match(output, /proxy-ready/);
});

test('Android source guards secure origin and non-destructive legacy storage migration', () => {
    // MainActivity owns the WebView client and the legacy file:// -> https migration
    // (LocalAssetClient.java is not referenced by any build source), so the same
    // guarantees are asserted on the code that actually runs.
    const activity = read('android/app/src/main/java/com/barcepte/app/MainActivity.java');
    const migration = read('storage-migration.js');
    const { restore } = require('../storage-migration.js');
    assert.match(activity, /WebViewAssetLoader\.AssetsPathHandler/);
    assert.match(activity, /"https:\/\/appassets\.androidplatform\.net\/assets\/index\.html"/);
    assert.match(activity, /LEGACY_URL = "file:\/\/\/android_asset\/index\.html"/);
    assert.match(activity, /webView\.loadUrl\(migrating \? LEGACY_URL : APP_URL\)/);
    assert.match(activity, /BarStorageMigration\.restore\(localStorage,JSON\.parse\("\s*\+ JSONObject\.quote\(migrationData\)/);
    assert.doesNotMatch(activity, /localStorage\.(?:clear|removeItem)\(/);
    assert.match(migration, /storage\.getItem\(entry\[0\]\) === null/);
    assert.doesNotMatch(migration, /storage\.clear\(/);
    // Restoring never overwrites a newer value already present in the new origin.
    const store = new Map([['kept', 'new']]);
    const storage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
    restore(storage, { version: 1, entries: [['kept', 'old'], ['added', 'legacy']] });
    assert.deepEqual([...store], [['kept', 'new'], ['added', 'legacy']]);
    assert.match(activity, /setAllowUniversalAccessFromFileURLs\(false\)/);
    assert.match(activity, /setAllowFileAccess\(false\)/);
    assert.match(activity, /setTestAdsEnabled\(BuildConfig\.DEBUG\)/);
    assert.match(activity, /catch \(ActivityNotFoundException/);
});

test('CI checks full dependencies and built APK contents without hiding Gradle failures', () => {
    const android = read('.github/workflows/build-apk.yml');
    assert.match(android, /set -euo pipefail/);
    assert.match(android, /check-assets\.cjs "\$RUNNER_TEMP\/apk-check\/assets"/);
    assert.doesNotMatch(android, /match the canonical allowlist/);
    const security = read('.github/workflows/security-checks.yml');
    assert.match(security, /npm audit --audit-level=moderate/);
    assert.doesNotMatch(security, /--omit=optional/);
});

test('APK asset check requires every canonical asset but tolerates SDK files merged into assets/', t => {
    const os = require('node:os');
    const { readAssetNames, checkBundle } = require('../scripts/check-assets.cjs');
    const bundle = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-apk-assets-'));
    t.after(() => fs.rmSync(bundle, { recursive: true, force: true }));
    const names = readAssetNames(root);
    for (const name of names) fs.copyFileSync(path.join(root, name), path.join(bundle, name));
    // What an ad SDK AAR may add: a sub-directory and non-web root files.
    fs.mkdirSync(path.join(bundle, 'startio'));
    fs.writeFileSync(path.join(bundle, 'startio', 'config.json'), '{}');
    fs.writeFileSync(path.join(bundle, 'sdk-fonts.ttf'), 'x');
    fs.writeFileSync(path.join(bundle, 'ad_template.dat'), 'x');
    assert.doesNotThrow(() => checkBundle(root, bundle, names));
    // A root-level web file outside web-assets.json, or a dotfile, is still rejected.
    for (const extra of ['debug.html', 'leftover.js', 'old.css', 'license-state.json', '.env']) {
        fs.writeFileSync(path.join(bundle, extra), 'x');
        assert.throws(() => checkBundle(root, bundle, names), new RegExp('unexpected \\[' + extra.replace('.', '\\.')));
        fs.unlinkSync(path.join(bundle, extra));
    }
    // A missing or stale canonical asset is rejected.
    fs.unlinkSync(path.join(bundle, 'reserve.js'));
    assert.throws(() => checkBundle(root, bundle, names), /missing \[reserve\.js\]/);
    fs.writeFileSync(path.join(bundle, 'reserve.js'), 'stale');
    assert.throws(() => checkBundle(root, bundle, names), /Stale bundled asset: reserve\.js/);
});
