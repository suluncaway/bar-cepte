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

// This test used to assert that logout removes Reserve. That locked in a bug: a key activated
// without a Google session is bound to this device on the server (it cannot follow the account),
// so signing out must not remove it. Account-bound Reserve is still removed (next test).
test('logout keeps device-bound Reserve, moves the lists to an on-device copy and preserves account backup', async () => {
    const app = setup();
    app.auth.saveUser({ uid: 'alice', provider: 'local' });
    app.storage.set('favoriteCocktails', '["recipe-1"]');
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, true);
    assert.equal(JSON.parse(app.storage.get('barcepte_reserve_entitlement')).binding, 'device');
    app.auth.logout();
    assert.equal(app.auth.isLoggedIn(), false);
    assert.equal(app.reserve.isReserveActive(), true, 'device-bound Reserve survives sign-out');
    assert.equal(app.storage.get('favoriteCocktails'), '[]');
    const backup = JSON.parse(app.storage.get('barcepte_cloud_data_alice'));
    assert.deepEqual(backup.data.favorites, ['recipe-1']);
});

test('logout removes account-bound Reserve and brings back a device key it had set aside', async () => {
    const app = setup();
    const { reserve, auth, key } = app;
    auth.saveUser({ uid: 'alice', provider: 'local' });
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    assert.equal((await reserve.verifyAndActivateLicense(key)).success, true);
    // The account server then reports the Google account's own (different) subscription.
    const accountKey = `RESERVE-ANN1-ACCT-${reserve.checksum('ANN1ACCT')}`;
    assert.equal(reserve.acceptServerSubscription({ key: accountKey, plan: 'annual', expiresAt: app.now() + 86400000 }, { binding: 'account' }), true);
    assert.equal(reserve.getSubscriptionInfo().key, accountKey);
    auth.logout();
    const info = reserve.getSubscriptionInfo();
    assert.equal(info.active, true);
    assert.equal(info.key, key, 'the device key is active again');
    // Without a device key, account-bound Reserve simply goes away.
    const other = setup();
    other.auth.saveUser({ uid: 'bob', provider: 'local' });
    assert.equal(other.reserve.acceptServerSubscription({ key: accountKey, plan: 'lifetime', expiresAt: 0 }, { binding: 'account' }), true);
    other.auth.logout();
    assert.equal(other.reserve.isReserveActive(), false);
});

test('Reserve of unknown binding (older versions) is re-checked as this device after logout', async () => {
    for (const [status, data, active] of [
        [409, { success: false, code: 'claimed_elsewhere' }, false],
        [409, { success: false, reason: 'conflict' }, true],
        [200, { success: true, plan: 'lifetime', expiresAt: 0, restored: true }, true]
    ]) {
        const app = setup();
        app.auth.saveUser({ uid: 'alice', provider: 'local' });
        app.storage.set('barcepte_reserve_entitlement', JSON.stringify({ key: app.key, plan: 'lifetime', expiresAt: 0, verifiedAt: app.now() }));
        app.context.fetch = async (...args) => { app.requests.push(args); return { ok: status < 300, status, json: async () => data }; };
        app.auth.logout();
        await app.reserve.revalidate();
        assert.equal(app.requests.filter(([url]) => url.endsWith('/api/claim-license')).length, 1);
        const sent = app.requests.find(([url]) => url.endsWith('/api/claim-license'))[1];
        assert.equal(sent.headers.Authorization, undefined, 'checked as this device, without the old session');
        assert.equal(app.reserve.isReserveActive(), active, `${status} ${JSON.stringify(data)}`);
    }
});

test('only explicit server rejection codes delete a key; a bare 409 is retried', async () => {
    const app = setup();
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, true);
    for (const data of [{ success: false }, { success: false, code: 'conflict' }]) {
        app.context.fetch = async () => ({ ok: false, status: 409, json: async () => data });
        assert.equal((await app.reserve.revalidate({ force: true })).status, 'kept');
        assert.equal(app.reserve.isReserveActive(), true);
    }
    app.context.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, code: 'claimed_elsewhere' }) });
    assert.equal((await app.reserve.revalidate({ force: true })).status, 'removed');
    assert.equal(app.reserve.isReserveActive(), false);
});

test('earlier legacy Reserve gets a 14-day grace from the first verification attempt, then needs the server', async () => {
    const app = setup();
    const { reserve, storage, key } = app;
    storage.set('barcepte_reserve_active', 'true');
    storage.set('barcepte_reserve_license', key);
    storage.set('barcepte_reserve_plan', 'lifetime');
    assert.equal(reserve.isReserveActive(), false, 'no grace before any verification attempt');
    // Offline: the key is kept and the grace period starts.
    assert.equal((await reserve.revalidate()).status, 'kept');
    const info = reserve.getSubscriptionInfo();
    assert.equal(info.active, true);
    assert.equal(info.grace, true);
    assert.equal(info.graceUntil, app.now() + 14 * 86400000);
    // A signed-in Google profile without a live session token also keeps the grace period.
    app.auth.saveUser({ uid: 'google_alice', provider: 'google' });
    assert.equal((await reserve.revalidate()).status, 'kept');
    assert.equal(reserve.isReserveActive(), true);
    app.advance(14 * 86400000);
    assert.equal(reserve.isReserveActive(), false, 'grace ends after 14 days');
    assert.equal(storage.get('barcepte_reserve_license'), key, 'the key itself is not deleted');
    // Expired legacy plans get no grace.
    const expired = setup();
    expired.storage.set('barcepte_reserve_active', 'true');
    expired.storage.set('barcepte_reserve_license', expired.key);
    expired.storage.set('barcepte_reserve_plan', 'monthly');
    expired.storage.set('barcepte_reserve_expires_at', String(expired.now() - 1));
    await expired.reserve.revalidate();
    assert.equal(expired.reserve.isReserveActive(), false);
    // Server confirmation replaces the grace with a verified entitlement; rejection clears it.
    const confirmed = setup();
    confirmed.storage.set('barcepte_reserve_active', 'true');
    confirmed.storage.set('barcepte_reserve_license', confirmed.key);
    confirmed.context.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, code: 'claimed_elsewhere' }) });
    assert.equal((await confirmed.reserve.revalidate()).status, 'removed');
    assert.equal(confirmed.reserve.isReserveActive(), false);
    assert.equal(confirmed.storage.has('barcepte_reserve_legacy_grace_since'), false);
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

test('legacy_requires_account on activation asks for the buyer\'s Google account and keeps the stored entitlement', async () => {
    const app = setup();
    app.respond({ success: true, plan: 'lifetime', expiresAt: 0 });
    assert.equal((await app.reserve.verifyAndActivateLicense(app.key)).success, true);
    const legacy = `RESERVE-MTH1-AB2C-${app.reserve.checksum('MTH1AB2C')}`;
    app.context.fetch = async () => ({ ok: false, status: 403, json: async () => ({ success: false, code: 'legacy_requires_account', reason: 'x' }) });
    const result = await app.reserve.verifyAndActivateLicense(legacy);
    assert.equal(result.success, false);
    assert.match(result.reason, /satın alırken kullandığın Google hesabıyla giriş yap ya da destekle iletişime geç/);
    assert.equal(app.reserve.getSubscriptionInfo().key, app.key, 'existing Reserve is untouched');
    // Anonymous not_issued also covers keys used elsewhere; the message says so.
    app.context.fetch = async () => ({ ok: false, status: 400, json: async () => ({ success: false, code: 'not_issued' }) });
    assert.match((await app.reserve.verifyAndActivateLicense(legacy)).reason, /başka bir hesapta\/cihazda/);
});
