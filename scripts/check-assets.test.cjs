'use strict';

// Standalone regression suite: node --test scripts/check-assets.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readAssetNames, checkReferences, checkBundle } = require('./check-assets.cjs');
const root = path.resolve(__dirname, '..');

test('canonical allowlist covers page, stylesheet, manifest and precache references', () => {
    checkReferences(root, readAssetNames(root));
});

test('Gradle bundles exactly the canonical web-assets.json list and syncs before every build', () => {
    const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
    // The Gradle allowlist is web-assets.json itself (parsed with JsonSlurper), the same
    // file readAssetNames() validates, so the two lists cannot drift apart.
    assert.match(gradle, /def webAssets = new JsonSlurper\(\)\.parse\(new File\(webRoot, 'web-assets\.json'\)\)/);
    assert.match(gradle, /tasks\.register\('syncWebAssets', Sync\)/);
    assert.match(gradle, /from\(webRoot\) \{ include webAssets \}/);
    assert.match(gradle, /into\(layout\.buildDirectory\.dir\('generated\/webAssets'\)\)/);
    // Legacy checked-in android assets are replaced: the only asset source is the synced copy.
    assert.match(gradle, /main\.assets\.srcDirs = \[layout\.buildDirectory\.dir\('generated\/webAssets'\)\]/);
    assert.match(gradle, /tasks\.named\('preBuild'\)\.configure \{ dependsOn\('syncWebAssets'\) \}/);
    assert.match(gradle, /throw new GradleException\("Missing web asset: \$\{asset\}"\)/);
});

test('bundle checker rejects stale bytes, missing dependencies, and secret extras', t => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-assets-'));
    t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const names = readAssetNames(root);
    for (const name of names) fs.copyFileSync(path.join(root, name), path.join(temporary, name));
    assert.doesNotThrow(() => checkBundle(root, temporary, names));

    fs.appendFileSync(path.join(temporary, 'auth.js'), '\n// stale Android copy');
    assert.throws(() => checkBundle(root, temporary, names), /Stale bundled asset: auth.js/);
    fs.copyFileSync(path.join(root, 'auth.js'), path.join(temporary, 'auth.js'));

    fs.unlinkSync(path.join(temporary, 'security.js'));
    assert.throws(() => checkBundle(root, temporary, names), /missing or unexpected/);
    fs.copyFileSync(path.join(root, 'security.js'), path.join(temporary, 'security.js'));

    fs.writeFileSync(path.join(temporary, '.env'), 'TEST_ONLY=true');
    assert.throws(() => checkBundle(root, temporary, names), /missing or unexpected/);
});

test('reference checker detects an unbundled local dependency', t => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-reference-'));
    t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    fs.writeFileSync(path.join(temporary, 'index.html'), '<script src="forgotten.js"></script>');
    assert.throws(() => checkReferences(temporary, ['index.html']), /unpackaged asset: forgotten.js/);
});
