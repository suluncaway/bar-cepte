'use strict';

// node scripts/check-assets.cjs [android/app/build/generated/canonicalWebAssets]
// With a directory argument, also verify that every canonical asset is bundled with canonical bytes
// and that no other web-root file (html/js/css/json/..., dotfiles) is; dependency files are ignored.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function readAssetNames(projectRoot = root) {
    // android/app/build.gradle loads the canonical list from web-assets.json (JsonSlurper).
    const gradle = fs.readFileSync(path.join(projectRoot, 'android/app/build.gradle'), 'utf8');
    assert.match(gradle, /web-assets\.json/, 'Gradle must load the canonical web-assets.json allowlist');
    const names = JSON.parse(fs.readFileSync(path.join(projectRoot, 'web-assets.json'), 'utf8'));
    assert.ok(Array.isArray(names) && names.every(name => typeof name === 'string'),
        'web-assets.json must be an array of file names');
    assert.ok(names.length > 0, 'Asset allowlist is empty');
    assert.equal(new Set(names).size, names.length, 'Duplicate assets');
    for (const name of names) {
        assert.match(name, /^[a-z0-9][a-z0-9.-]*\.(?:html|css|js|json|png|webp|mp4|svg|txt)$/, `Unsafe asset: ${name}`);
        assert.doesNotMatch(name, /(?:secret|private|credentials|service-account|package|main\.js)/i,
            `Non-client asset: ${name}`);
    }
    return names;
}

function checkReferences(projectRoot, names) {
    const allowed = new Set(names);
    function check(reference, owner) {
        if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return;
        const local = reference.split(/[?#]/)[0].replace(/^\.\//, '');
        if (!local) return;
        assert.ok(allowed.has(local), `${owner} references unpackaged asset: ${reference}`);
    }
    for (const name of names) {
        assert.ok(fs.statSync(path.join(projectRoot, name)).isFile(), `Missing asset: ${name}`);
        if (!/\.(?:html|css)$/.test(name)) continue;
        const text = fs.readFileSync(path.join(projectRoot, name), 'utf8');
        const references = name.endsWith('.html')
            ? text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)
            : text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi);
        for (const match of references) check(match[1], name);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
    check(manifest.start_url, 'manifest.json');
    for (const icon of manifest.icons || []) check(icon.src, 'manifest.json');
    const worker = fs.readFileSync(path.join(projectRoot, 'sw.js'), 'utf8');
    const assets = worker.match(/const ASSETS = \[([\s\S]*?)\]/);
    assert.ok(assets, 'Service-worker precache list not found');
    for (const match of assets[1].matchAll(/['"]([^'"]+)['"]/g)) check(match[1], 'sw.js');
}

// Root-level names that would be served as part of the web app (or are secrets/dotfiles):
// any such file in the APK that web-assets.json does not list is an error. Other entries, such as
// files and directories that dependencies (e.g. the Start.io AAR) merge into assets/, are allowed.
const WEB_ROOT_FILE = /^\.|\.(?:html?|m?js|cjs|css|json|map|webmanifest|txt|xml|env|pem|key|sqlite|db)$/i;

function checkBundle(projectRoot, bundle, names) {
    const entries = fs.readdirSync(bundle, { withFileTypes: true });
    const present = new Map(entries.map(entry => [entry.name, entry]));
    const allowed = new Set(names);
    const missing = names.filter(name => !present.has(name));
    const unexpected = entries.filter(entry => !allowed.has(entry.name) &&
        (WEB_ROOT_FILE.test(entry.name) || entry.isSymbolicLink())).map(entry => entry.name);
    assert.ok(!missing.length && !unexpected.length,
        `Bundle has missing or unexpected assets: missing [${missing.join(', ')}], unexpected [${unexpected.join(', ')}]`);
    for (const name of names) {
        const entry = present.get(name);
        assert.ok(entry.isFile(), `Not a regular bundled file: ${name}`);
        assert.ok(fs.readFileSync(path.join(bundle, name)).equals(
            fs.readFileSync(path.join(projectRoot, name))), `Stale bundled asset: ${name}`);
    }
}

if (require.main === module) {
    try {
        assert.ok(process.argv.length <= 3, 'Usage: node scripts/check-assets.cjs [asset-directory]');
        const names = readAssetNames();
        checkReferences(root, names);
        if (process.argv[2]) checkBundle(root, path.resolve(process.argv[2]), names);
        console.log(`OK: ${names.length} canonical Android assets; references complete${process.argv[2] ? '; bundle bytes match' : ''}.`);
    } catch (error) {
        console.error(`Asset check failed: ${error.message}`);
        process.exitCode = 1;
    }
}

module.exports = { readAssetNames, checkReferences, checkBundle };
