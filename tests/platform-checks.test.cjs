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
    // MainActivity owns the live WebView setup and the file:// -> https storage migration
    // (exercised on an emulator by the upgrade-test job in build-apk.yml).
    const activity = read('android/app/src/main/java/com/barcepte/app/MainActivity.java');
    const migration = read('storage-migration.js');
    assert.match(activity, /WebViewAssetLoader\.AssetsPathHandler/);
    assert.match(activity, /"https:\/\/appassets\.androidplatform\.net\/assets\/index\.html"/);
    assert.match(activity, /JSONObject\.quote\(migrationData\)/);
    assert.match(activity, /setAllowUniversalAccessFromFileURLs\(false\)/);
    assert.match(activity, /setAllowFileAccess\(false\)/);
    assert.match(activity, /setTestAdsEnabled\(BuildConfig\.DEBUG\)/);
    // A device without a handler for an external link must not crash the app.
    assert.match(activity, /try \{\s*Intent intent = new Intent\(Intent\.ACTION_VIEW[\s\S]*?startActivity\(intent\);[\s\S]*?\} catch \(Exception/);
    assert.match(activity, /webView\.loadUrl\(migrating \? LEGACY_URL : APP_URL\)/);
    for (const source of [activity, migration]) assert.doesNotMatch(source, /localStorage\.(?:clear|removeItem)\(/);
});

test('CI checks full dependencies and built APK contents without hiding Gradle failures', () => {
    const android = read('.github/workflows/build-apk.yml');
    assert.match(android, /set -euo pipefail/);
    assert.match(android, /check-assets\.cjs "\$RUNNER_TEMP\/apk-check\/assets"/);
    const security = read('.github/workflows/security-checks.yml');
    assert.match(security, /npm audit --audit-level=moderate/);
    assert.doesNotMatch(security, /--omit=optional/);
});
