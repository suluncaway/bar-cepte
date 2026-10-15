const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const assets = require('../web-assets.json');

function reserveSandbox(fetch) {
    const values = new Map();
    const sandbox = {
        module: {exports: {}}, console: {warn() {}}, fetch,
        setTimeout, clearTimeout, AbortController,
        localStorage: {
            getItem: key => values.get(key) || null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: key => values.delete(key)
        }
    };
    vm.runInNewContext(fs.readFileSync('reserve.js', 'utf8'), sandbox);
    return sandbox.module.exports;
}

function testKey() {
    const {generateKey} = require('../scripts/generate-keys');
    return generateKey('monthly');
}

test('failed or malformed central verification never activates a new subscription', async () => {
    for (const fetch of [
        async () => { throw new Error('offline'); },
        async () => ({ok: true, json: async () => { throw new Error('HTML instead of JSON'); }}),
        async () => ({ok: true, json: async () => ({success: true, plan: 'monthly'})}),
        async () => ({ok: false, status: 503, json: async () => ({success: false})})
    ]) {
        const reserve = reserveSandbox(fetch);
        assert.equal((await reserve.verifyAndActivateLicense(testKey())).success, false);
        assert.equal(reserve.isReserveActive(), false);
    }
});

test('successful central verification preserves server expiration', async () => {
    const expiresAt = Date.now() + 86400000;
    const reserve = reserveSandbox(async () => ({
        ok: true, json: async () => ({success: true, plan: 'monthly', expiresAt})
    }));
    assert.equal((await reserve.verifyAndActivateLicense(testKey())).success, true);
    assert.equal(reserve.getSubscriptionInfo().expiresAt, expiresAt);
});

test('public legacy master strings cannot bypass central verification', async () => {
    let calls = 0;
    const reserve = reserveSandbox(async () => {
        calls++;
        return {ok: false, status: 400, json: async () => ({success: false})};
    });
    assert.equal((await reserve.verifyAndActivateLicense('RESERVE-SULUNCA-2026')).success, false);
    assert.equal(calls, 1);
    assert.equal(reserve.isReserveActive(), false);
});

test('all local HTML entrypoint resources are bundled on desktop and Android', () => {
    for (const entry of ['index.html', 'privacy.html']) {
        const html = fs.readFileSync(entry, 'utf8');
        for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
            const resource = match[1];
            if (/^[a-z]+:/i.test(resource) || resource.startsWith('//')) continue;
            const name = resource.replace(/^\.\//, '').split(/[?#]/)[0];
            assert.ok(assets.includes(name), `${entry}: ${name} missing from shared bundle`);
        }
    }
    const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
    assert.match(gradle, /web-assets\.json/);
    assert.match(gradle, /dependsOn\('syncWebAssets'\)/);
});
