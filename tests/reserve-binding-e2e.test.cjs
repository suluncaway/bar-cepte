// End to end: the real license server (createServer + temporary file store) and the real auth.js +
// reserve.js in a browser-like realm. Google identity is stubbed (the "credential" names the account);
// the client's https://bar-cepte-webhook.onrender.com requests are redirected to the local server.
// No test contacts Shopier, Resend, OpenAI or Google.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const keys = require('../scripts/generate-keys');
const security = require('../security');
const { createFileStore } = require('../scripts/license-store');
const { createServer } = require('../scripts/shopier-webhook');

const API = 'https://bar-cepte-webhook.onrender.com';
const HOUR = 3600000;
const BUYER_EMAIL = 'buyer@example.invalid';

async function world(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-binding-e2e-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = createFileStore(dir);
    let now = 1800000000000;
    const server = createServer({ store, now: () => now, rejectionFloorMs: 0,
        limits: { licensePerIp: 1000, licenseGlobal: 10000, authPerIp: 1000, authGlobal: 10000 },
        verifyGoogle: async token => ({ uid: 'google_' + token, email: token + '@example.invalid', provider: 'google', name: token }) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const sell = async (licenseKey, planType = 'annual') => {
        await store.createSale({ orderId: 'order-' + licenseKey, licenseKey, planType, email: BUYER_EMAIL, name: 'Buyer', createdAt: new Date(now).toISOString() });
        return licenseKey;
    };
    const post = async (route, body, token) => {
        const response = await fetch(origin + route, { method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
        return { status: response.status, data: await response.json() };
    };
    return { store, origin, sell, post, now: () => now, advance: ms => { now += ms; } };
}

// One device: its own localStorage (and device id), the real auth.js and reserve.js.
function device(w, initial = {}) {
    const storage = (seed = {}) => {
        const map = new Map(Object.entries(seed));
        return { map, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) };
    };
    const local = storage({ barcepte_cloud_backup_consent: 'denied', ...initial });
    const toasts = [];
    const requests = [];
    const context = vm.createContext({
        module: { exports: {} }, console, URL, AbortController, atob, crypto: webcrypto,
        setTimeout, clearTimeout,
        Date: class extends Date { static now() { return w.now(); } },
        localStorage: local, sessionStorage: storage(), BarSecurity: security,
        alert() {}, showToast: message => toasts.push(message),
        fetch: (url, options = {}) => {
            assert.ok(url.startsWith(API + '/'), url);
            requests.push({ url, options });
            return fetch(w.origin + url.slice(API.length), options);
        }
    });
    for (const file of ['auth.js', 'reserve.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    const reserve = context.BarReserve;
    return {
        local, toasts, requests, auth: context.BarAuth, reserve,
        deviceId: () => context.BarAuth.getDeviceId(),
        entitlement: () => JSON.parse(local.getItem('barcepte_reserve_entitlement') || 'null'),
        // Sign-in starts a forced re-validation in the background; wait for it.
        async signIn(name) {
            await context.BarAuth.handleGoogleCredentialResponse({ credential: name });
            await reserve.revalidate({ force: true });
        }
    };
}

test('N1: device-bound Reserve survives Google sign-in, sign-out and the next day\'s anonymous re-check', async t => {
    const w = await world(t);
    const key = await w.sell(keys.generateKey('annual'));
    const phone = device(w);
    assert.equal((await phone.reserve.verifyAndActivateLicense(key)).success, true);
    assert.equal(phone.entitlement().binding, 'device');

    await phone.signIn('alice');
    assert.equal(phone.auth.getCurrentUser().uid, 'google_alice');
    const claim = (await w.store.getClaimed())[key];
    assert.equal(claim.uid, null, 'a signed-in re-check does not attach the account to a device claim');
    assert.equal(claim.binding, 'device');
    assert.equal(phone.entitlement().binding, 'device', 'the server said the key is bound to the device');
    assert.equal(await w.store.getSubscription('google_alice', w.now()), null, 'the key does not follow the account');

    phone.auth.logout();
    assert.equal(phone.reserve.isReserveActive(), true, 'device-bound Reserve stays after sign-out');
    w.advance(25 * HOUR);
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed');
    assert.equal(phone.reserve.isReserveActive(), true);
    assert.equal(phone.entitlement().binding, 'device');
    const last = phone.requests.filter(r => r.url.endsWith('/api/claim-license')).at(-1);
    assert.equal(last.options.headers.Authorization, undefined, 'the re-check was anonymous');
    // The owner-only check endpoint reports the binding as well.
    const check = await w.post('/api/check-license', { key, deviceId: phone.deviceId() });
    assert.deepEqual([check.data.valid, check.data.boundTo], [true, 'device']);
});

test('N1: another Google account signing in on the same device does not get the device key', async t => {
    const w = await world(t);
    const key = await w.sell(keys.generateKey('monthly'), 'monthly');
    const phone = device(w);
    assert.equal((await phone.reserve.verifyAndActivateLicense(key)).success, true);
    await phone.signIn('bob');
    assert.equal(phone.reserve.isReserveActive(), true, 'still active on this device');
    assert.equal((await w.store.getClaimed())[key].uid, null);
    assert.equal(await w.store.getSubscription('google_bob', w.now()), null);
    phone.auth.logout();
    // Bob on his own device: no Reserve from the account, and the key is refused there.
    const tablet = device(w);
    await tablet.signIn('bob');
    assert.equal(tablet.reserve.isReserveActive(), false);
    const tabletClaim = await tablet.reserve.verifyAndActivateLicense(key);
    assert.equal(tabletClaim.success, false);
    assert.equal(tablet.reserve.isReserveActive(), false);
    // The original device keeps it.
    w.advance(25 * HOUR);
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed');
    assert.equal(phone.reserve.isReserveActive(), true);
});

test('N1: a key claimed while signed in is bound to the account, and the server says so', async t => {
    const w = await world(t);
    const key = await w.sell(keys.generateKey('annual'));
    const phone = device(w);
    await phone.signIn('carol');
    assert.equal((await phone.reserve.verifyAndActivateLicense(key)).success, true);
    assert.equal(phone.entitlement().binding, 'account');
    assert.equal((await w.store.getClaimed())[key].binding, 'account');
    phone.auth.logout();
    assert.equal(phone.reserve.isReserveActive(), false, 'account-bound Reserve leaves with the account');
    // An account claim is not usable anonymously, not even from the device that made it.
    const anonymous = await w.post('/api/claim-license', { key, deviceId: phone.deviceId() });
    assert.deepEqual([anonymous.status, anonymous.data.code], [400, 'not_issued']);
});

test('N1: records whose uid an earlier server attached silently still work anonymously on their device', async t => {
    const w = await world(t);
    const key = await w.sell(keys.generateKey('annual'));
    const deviceId = 'dev_' + 'a'.repeat(64);
    // Stored by the earlier server: anonymous device claim, then the signed-in user's uid added; no binding field.
    await w.store.claim(key, { key, plan: 'annual', duration: 365 * 86400000, claimedAt: w.now(), expiresAt: w.now() + 365 * 86400000,
        uid: 'google_alice', email: 'alice@example.invalid', deviceId });
    const phone = device(w, { barcepte_device_id: deviceId,
        barcepte_reserve_entitlement: JSON.stringify({ key, plan: 'annual', expiresAt: w.now() + 365 * 86400000, verifiedAt: w.now(), binding: 'device' }) });
    // Signing in: the account server lists the claim (it carries the uid), the license server answers 'device'.
    await phone.signIn('alice');
    assert.equal(phone.entitlement().binding, 'device');
    phone.auth.logout();
    assert.equal(phone.reserve.isReserveActive(), true);
    w.advance(25 * HOUR);
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed');
    assert.equal(phone.reserve.isReserveActive(), true);
    // Another device still cannot use it anonymously.
    const other = await w.post('/api/claim-license', { key, deviceId: 'dev_' + 'b'.repeat(64) });
    assert.equal(other.data.code, 'not_issued');
});

test('N2: a made-up legacy key written as an entitlement is removed at the next re-check', async t => {
    const w = await world(t);
    const fake = `RESERVE-ANN1-FAKE-${keys.checksum('ANN1FAKE')}`;
    const phone = device(w, { barcepte_reserve_entitlement: JSON.stringify({ key: fake, plan: 'lifetime', expiresAt: 0, verifiedAt: 0, binding: 'device' }) });
    assert.equal(phone.reserve.isReserveActive(), true, 'local storage alone shows Reserve until the re-check');
    const result = await phone.reserve.revalidate();
    assert.deepEqual([result.status, result.code], ['removed', 'legacy_requires_account']);
    assert.equal(phone.reserve.isReserveActive(), false);
    assert.equal(phone.local.getItem('barcepte_reserve_entitlement'), null);
    assert.match(phone.toasts.at(-1), /satın alırken kullandığın Google hesabıyla giriş yap/);
    // A sold legacy key that belongs to someone else is refused the same way.
    const sold = await w.sell(`RESERVE-ANN1-SOLD-${keys.checksum('ANN1SOLD')}`);
    const thief = device(w, { barcepte_reserve_entitlement: JSON.stringify({ key: sold, plan: 'annual', expiresAt: w.now() + 86400000, verifiedAt: 0 }) });
    assert.equal((await thief.reserve.revalidate()).status, 'removed');
    assert.equal(thief.reserve.isReserveActive(), false);
    // A verification time in the future does not postpone the check.
    const future = device(w, { barcepte_reserve_entitlement: JSON.stringify({ key: fake, plan: 'lifetime', expiresAt: 0, verifiedAt: w.now() + 1e12 }) });
    assert.equal((await future.reserve.revalidate()).status, 'removed');
});

test('N2: unverified legacy flags keep only a grace period that cannot be moved forward', async t => {
    const w = await world(t);
    const fake = `RESERVE-MTH1-FAKE-${keys.checksum('MTH1FAKE')}`;
    const flags = { barcepte_reserve_active: 'true', barcepte_reserve_license: fake, barcepte_reserve_plan: 'lifetime' };
    const phone = device(w, flags);
    assert.equal((await phone.reserve.revalidate()).status, 'kept', '403 is tolerated for never-verified flags');
    assert.equal(phone.reserve.getSubscriptionInfo().grace, true);
    const since = phone.local.getItem('barcepte_reserve_legacy_grace_since');
    w.advance(HOUR);
    await phone.reserve.revalidate();
    assert.equal(phone.local.getItem('barcepte_reserve_legacy_grace_since'), since, 'written once');
    w.advance(14 * 24 * HOUR);
    assert.equal(phone.reserve.isReserveActive(), false, 'the grace period ends');
    // Edited start values: in the future or malformed, they end the grace instead of restarting it.
    for (const value of [String(w.now() + HOUR), 'abc', '', '1e15', String(w.now()) + '.5']) {
        const edited = device(w, { ...flags, barcepte_reserve_legacy_grace_since: value });
        await edited.reserve.revalidate();
        assert.equal(edited.reserve.isReserveActive(), false, JSON.stringify(value));
        assert.equal(edited.local.getItem('barcepte_reserve_legacy_grace_since'), value, 'not rewritten');
    }
});

test('N2: a real legacy key sealed to this device stays through sign-in, sign-out and anonymous re-checks', async t => {
    const w = await world(t);
    const legacy = await w.sell(`RESERVE-ANN1-QW7E-${keys.checksum('ANN1QW7E')}`);
    const deviceId = 'dev_' + 'c'.repeat(64);
    // Sealed anonymously before legacy keys required an account.
    await w.store.claim(legacy, { key: legacy, plan: 'annual', claimedAt: w.now(), expiresAt: w.now() + 365 * 86400000, uid: null, email: '', deviceId });
    const phone = device(w, { barcepte_device_id: deviceId,
        barcepte_reserve_entitlement: JSON.stringify({ key: legacy, plan: 'annual', expiresAt: w.now() + 365 * 86400000, verifiedAt: 0 }) });
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed', 'no 403 for the sealing device');
    assert.equal(phone.entitlement().binding, 'device');
    await phone.signIn('someone');
    phone.auth.logout();
    w.advance(25 * HOUR);
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed');
    assert.equal(phone.reserve.isReserveActive(), true);
    assert.equal((await w.store.getClaimed())[legacy].uid, null);
});

test('N2: a real legacy key the buyer activated with an older version stays on that device when checked anonymously', async t => {
    const w = await world(t);
    const legacy = await w.sell(`RESERVE-MTH1-AB2C-${keys.checksum('MTH1AB2C')}`, 'monthly');
    const deviceId = 'dev_' + 'd'.repeat(64);
    // The buyer's account claimed it on this device before bindings were recorded; the older client
    // stored the entitlement without a binding.
    await w.store.claim(legacy, { key: legacy, plan: 'monthly', claimedAt: w.now(), expiresAt: w.now() + 30 * 86400000,
        uid: 'google_buyer', email: BUYER_EMAIL, deviceId });
    const phone = device(w, { barcepte_device_id: deviceId,
        barcepte_reserve_entitlement: JSON.stringify({ key: legacy, plan: 'monthly', expiresAt: w.now() + 30 * 86400000, verifiedAt: w.now() }) });
    w.advance(25 * HOUR);
    assert.equal((await phone.reserve.revalidate()).status, 'confirmed');
    assert.equal(phone.reserve.isReserveActive(), true);
    assert.equal(phone.entitlement().binding, 'device');
    // Anyone else, anonymous or signed in with another account, still gets 403.
    const stranger = await w.post('/api/claim-license', { key: legacy, deviceId: 'dev_' + 'e'.repeat(64) });
    assert.deepEqual([stranger.status, stranger.data.code], [403, 'legacy_requires_account']);
});

test('N4: Reserve state goes through BarCepteNative when present, else through AndroidBridge', () => {
    const run = extra => {
        const context = vm.createContext({ console, crypto: webcrypto, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, ...extra });
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'reserve.js'), 'utf8'), context);
        context.BarReserve.applyReserveUI();
    };
    const posted = [], bridged = [];
    run({ BarCepteNative: { postMessage: m => posted.push(JSON.parse(m)) }, AndroidBridge: { setReserveActive: v => bridged.push(v) } });
    assert.deepEqual(posted.at(-1), { type: 'setReserveActive', active: false });
    assert.equal(bridged.length, 0, 'the older bridge is not used when the channel exists');
    run({ AndroidBridge: { setReserveActive: v => bridged.push(v) } });
    assert.deepEqual(bridged, [false]);
});
