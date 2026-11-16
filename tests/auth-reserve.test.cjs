const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

// Separate browser-like realms keep credentials, entitlement and storage isolated.
// Fetch is always intercepted: these tests never contact the license service.
function setup() {
    const storage = new Map();
    const requests = [];
    let now = 1800000000000;
    let monotonic = 0;
    const context = vm.createContext({
        URL, crypto: webcrypto, atob,
        Date: class extends Date { static now() { return now; } },
        performance: { now: () => monotonic },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key)
        },
        setTimeout: () => 1,
        clearTimeout: () => {},
        fetch: async (...args) => {
            requests.push(args);
            throw new Error('Offline');
        }
    });
    for (const file of ['auth.js', 'reserve.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    }
    const auth = context.BarAuth;
    const reserve = context.BarReserve;
    const key = `RESERVE-MTH1-TEST-${reserve.checksum('MTH1TEST')}`;
    return {
        context, storage, requests, auth, reserve, key,
        now: () => now,
        advance: ms => { now += ms; monotonic += ms; },
        respond(data, ok = true) {
            context.fetch = async (...args) => {
                requests.push(args);
                return { ok, json: async () => data };
            };
        }
    };
}

test('local flags, backups and claim registries never authorize Reserve', async () => {
    const app = setup();
    const { auth, reserve, storage, key } = app;
    auth.saveUser({ uid: 'alice', isReserve: true, plan: 'lifetime', reserveKey: key });
    storage.set('barcepte_reserve_active', 'true');
    storage.set('barcepte_reserve_license', key);
    storage.set('barcepte_reserve_plan', 'lifetime');
    storage.set('barcepte_claimed_licenses', JSON.stringify({ [key]: { uid: 'alice' } }));
    assert.equal(auth.getCurrentUser().isReserve, false);
    assert.equal(auth.claimLicenseKey(key, 'lifetime', 0), false);
    assert.equal(reserve.activateReserve(key), false);
    assert.equal(reserve.activateFromCloud({ active: true, plan: 'lifetime', key }), false);
    // This is only a format check, not an ownership decision.
    assert.equal(auth.canUseLicenseKey(key).allowed, true);
    assert.equal((await reserve.verifyAndActivateLicense(key)).success, false);
    assert.equal(reserve.isReserveActive(), false);
    assert.equal(app.requests.length, 1);
});

test('server verification activates without a DOM and uses server plan and expiry', async () => {
    const app = setup();
    const expiresAt = app.now() + 86400000;
    app.respond({ success: true, plan: 'annual', expiresAt });
    const result = await app.reserve.verifyAndActivateLicense(` ${app.key.toLowerCase()} `);
    assert.equal(result.success, true);
    assert.equal(app.reserve.getSubscriptionInfo().plan, 'annual');
    assert.equal(app.reserve.getSubscriptionInfo().expiresAt, expiresAt);
    const [url, options] = app.requests[0];
    assert.equal(url, 'https://bar-cepte-webhook.onrender.com/api/claim-license');
    assert.equal(options.method, 'POST');
    const payload = JSON.parse(options.body);
    assert.equal(payload.key, app.key);
    // New device IDs carry 256 random bits. The ID is sent verbatim (with its dev_ prefix) because
    // existing device-bound claims on the server are keyed by the exact string older clients sent.
    assert.match(payload.deviceId, /^dev_[a-f0-9]{64}$/);
    assert.equal(payload.deviceId, app.auth.getDeviceId());
    assert.equal('idToken' in payload, false);
    app.advance(86400000);
    assert.equal(app.reserve.isReserveActive(), false);
    assert.equal(app.reserve.getSubscriptionInfo().expired, true);
});

for (const [label, response, ok] of [
    ['claimed by another account', { success: false, reason: 'Already claimed' }, true],
    ['expired key', { success: true, plan: 'monthly', expiresAt: 1799999999999 }, true],
    ['missing expiry', { success: true, plan: 'monthly' }, true],
    ['invalid plan', { success: true, plan: 'admin', expiresAt: 0 }, true],
    ['invalid lifetime expiry', { success: true, plan: 'lifetime', expiresAt: 1800000001000 }, true],
    ['HTTP error', { success: true, plan: 'lifetime', expiresAt: 0 }, false]
]) {
    test(`server rejects or returns ${label}: no local authorization fallback`, async () => {
        const app = setup();
        app.respond(response, ok);
        assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, false);
        assert.equal(app.reserve.isReserveActive(), false);
        assert.equal(app.storage.has('barcepte_reserve_license'), false);
    });
}

test('logout clears verified entitlement without a DOM and preserves account backup', async () => {
    const app = setup();
    app.auth.saveUser({ uid: 'alice', provider: 'local' });
    app.storage.set('favoriteCocktails', '["recipe-1"]');
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, true);
    app.auth.logout();
    assert.equal(app.auth.isLoggedIn(), false);
    assert.equal(app.reserve.isReserveActive(), false);
    assert.equal(app.storage.get('favoriteCocktails'), '[]');
    const backup = JSON.parse(app.storage.get('barcepte_cloud_data_alice'));
    assert.deepEqual(backup.data.favorites, ['recipe-1']);
});

test('logout during server verification invalidates the pending response', async () => {
    const app = setup();
    app.auth.saveUser({ uid: 'alice' });
    let resolveResponse;
    app.context.fetch = () => new Promise(resolve => { resolveResponse = resolve; });
    const pending = app.reserve.verifyAndActivateLicense(app.key);
    app.auth.logout();
    resolveResponse({ ok: true, json: async () => ({ success: true, plan: 'lifetime', expiresAt: 0 }) });
    assert.equal((await pending).success, false);
    assert.equal(app.reserve.isReserveActive(), false);
});

test('persisted Google profiles cannot claim without a fresh credential', async () => {
    const app = setup();
    app.auth.saveUser({ uid: 'google_alice', provider: 'google' });
    assert.equal(app.auth.getIdToken(), null);
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, false);
    assert.equal(app.requests.length, 0);
});

test('frontend redeems a canonical key through the real local API', async t => {
    const os = require('node:os');
    // The production server uses scripts/license-store.js (file store here, PostgreSQL on Render);
    // scripts/backend/store.js is not wired to any route, so the contract is tested against the real store.
    const { createFileStore } = require('../scripts/license-store');
    const { createServer } = require('../scripts/shopier-webhook');
    const { execFileSync } = require('node:child_process');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-contract-'));
    let server;
    t.after(async () => {
        if (server) await new Promise(resolve => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    // Exercise the actual CLI -> persistent store -> HTTP API -> frontend contract.
    execFileSync(process.execPath, ['scripts/generate-keys.js', 'monthly', '1', '--save'], {
        cwd: path.join(__dirname, '..'), env: { ...process.env, LICENSE_DATA_DIR: directory }
    });
    const store = createFileStore(directory);
    const key = (await store.getSold())[0].licenseKey;
    assert.match(key, /^RESERVE-MTH1-[A-Z2-9]{26}-[0-9A-F]{4}$/);
    const app = setup();
    server = createServer({ store, now: app.now });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    app.context.fetch = (url, options) => {
        assert.equal(url, 'https://bar-cepte-webhook.onrender.com/api/claim-license');
        return fetch(`http://127.0.0.1:${server.address().port}/api/claim-license`, options);
    };
    assert.equal((await app.reserve.verifyAndActivateLicense(key)).success, true);
    assert.equal(app.reserve.getSubscriptionInfo().plan, 'monthly');
    assert.equal(app.reserve.isReserveActive(), true);
    assert.equal((await app.reserve.verifyAndActivateLicense(key)).success, true);
    assert.equal(Object.keys(await store.getClaimed()).length, 1);
});

test('storage failure cannot report failed activation while granting entitlement', async () => {
    const app = setup();
    app.auth.getDeviceId();
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    app.context.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, false);
    assert.equal(app.reserve.isReserveActive(), false);
});
