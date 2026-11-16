// Server-side license hardening: key entropy and format, legacy keys, rate limits and backoff,
// owner-only license checks, refund revocation, e-mail escaping, AI error/daily cap, account deletion,
// and client re-validation. No test contacts Shopier, Resend, OpenAI or Google.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const keys = require('../scripts/generate-keys');
const { createFileStore } = require('../scripts/license-store');
const { createServer, buildLicenseEmail } = require('../scripts/shopier-webhook');
const { createFulfillmentService } = require('../scripts/order-fulfillment');

function tempStore(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-hardening-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return { dir, store: createFileStore(dir) };
}

async function startServer(t, options) {
    const server = createServer(options);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const call = async (route, body, { ip = '198.51.100.1', method = 'POST', headers = {} } = {}) => {
        const response = await fetch(origin + route, {
            method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...headers },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        let data = null;
        try { data = await response.json(); } catch {}
        return { status: response.status, data, headers: response.headers };
    };
    return { origin, call };
}

const sale = (licenseKey, planType = 'monthly', orderId = 'order-' + licenseKey.slice(-8)) =>
    ({ orderId, licenseKey, planType, email: 'buyer@example.invalid', name: 'Buyer', createdAt: new Date().toISOString() });

test('new keys carry 130 random bits in a 4-part format and never repeat', () => {
    const seen = new Set();
    const counts = new Map();
    for (let i = 0; i < 3000; i++) {
        const key = keys.generateKey(['monthly', 'annual', 'lifetime'][i % 3]);
        assert.match(key, /^RESERVE-(MTH1|ANN1|LIFE)-[A-HJ-NP-Z2-9]{26}-[0-9A-F]{4}$/);
        assert.equal(keys.isValidKeyFormat(key), true);
        assert.equal(keys.isLegacyKey(key), false);
        assert.ok(!seen.has(key));
        seen.add(key);
        for (const c of key.split('-')[2]) counts.set(c, (counts.get(c) || 0) + 1);
    }
    assert.equal(keys.RANDOM_LENGTH * Math.log2(keys.KEY_ALPHABET.length) >= 128, true);
    // Every symbol of the 32-letter alphabet shows up with a roughly uniform frequency.
    assert.equal(counts.size, 32);
    const expected = 3000 * 26 / 32;
    for (const n of counts.values()) assert.ok(Math.abs(n - expected) < expected * 0.15);
    // A typo is caught by the (public) checksum.
    const key = keys.generateKey('annual');
    const typo = key.slice(0, 15) + (key[15] === 'A' ? 'B' : 'A') + key.slice(16);
    assert.equal(keys.isValidKeyFormat(typo), false);
});

test('legacy short keys stay valid in format, client and server, but only while registered', async t => {
    const legacy = `RESERVE-MTH1-AB2C-${keys.checksum('MTH1AB2C')}`;
    assert.equal(keys.isValidKeyFormat(legacy), true);
    assert.equal(keys.isLegacyKey(legacy), true);
    const reserve = require('../reserve.js');
    assert.equal(reserve.validateLicenseKey(legacy), true);
    assert.equal(reserve.validateLicenseKey(keys.generateKey('lifetime')), true);
    assert.equal(reserve.validateLicenseKey('RESERVE-SULUNCA-2026'), false, 'old public master strings are gone');

    const { store } = tempStore(t);
    await store.createSale(sale(legacy));
    const { call } = await startServer(t, { store });
    const first = await call('/api/claim-license', { key: legacy.toLowerCase(), deviceId: 'dev_alice-phone' });
    assert.equal(first.status, 200);
    assert.equal(first.data.plan, 'monthly');
    const unregistered = `RESERVE-MTH1-ZZ9Z-${keys.checksum('MTH1ZZ9Z')}`;
    const missing = await call('/api/claim-license', { key: unregistered, deviceId: 'dev_alice-phone' }, { ip: '198.51.100.2' });
    assert.equal(missing.status, 400);
    assert.equal(missing.data.code, 'not_issued');
});

test('claims are limited per address and globally, and repeated failures back off', async t => {
    const { store } = tempStore(t);
    let now = 1800000000000;
    const { call } = await startServer(t, { store, now: () => now, limits: { licensePerIp: 4, licenseGlobal: 6 } });
    const guess = () => keys.generateKey('monthly');
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await call('/api/claim-license', { key: guess(), deviceId: 'dev_attacker1' }, { ip: '203.0.113.9' })).status);
    assert.deepEqual(statuses, [400, 400, 400, 400, 429]);
    // Spoofed first X-Forwarded-For entries do not create a new budget.
    assert.equal((await call('/api/claim-license', { key: guess(), deviceId: 'dev_attacker1' }, { ip: '10.0.0.1, 203.0.113.9' })).status, 429);
    // Other addresses share the global hourly ceiling.
    assert.equal((await call('/api/claim-license', { key: guess(), deviceId: 'dev_b' }, { ip: '203.0.113.10' })).status, 400);
    assert.equal((await call('/api/claim-license', { key: guess(), deviceId: 'dev_b' }, { ip: '203.0.113.11' })).status, 400);
    const global = await call('/api/claim-license', { key: guess(), deviceId: 'dev_b' }, { ip: '203.0.113.12' });
    assert.equal(global.status, 429);
    assert.ok(Number(global.headers.get('retry-after')) > 0);
    // After the window, an address with many failures is locked out for a growing time.
    now += 60 * 60 * 1000;
    const backoff = createServer({ store, now: () => now, limits: { licensePerIp: 100, licenseGlobal: 1000 } });
    await new Promise(resolve => backoff.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => backoff.close(resolve)));
    const url = `http://127.0.0.1:${backoff.address().port}/api/claim-license`;
    const post = () => fetch(url, { method: 'POST', headers: { 'X-Forwarded-For': '203.0.113.50' }, body: JSON.stringify({ key: guess(), deviceId: 'dev_attacker2' }) });
    const seen = [];
    for (let i = 0; i < 7; i++) seen.push((await post()).status);
    assert.deepEqual(seen, [400, 400, 400, 400, 400, 400, 429]);
    const locked = await post();
    assert.equal(locked.status, 429);
    const firstWait = Number(locked.headers.get('retry-after'));
    now += firstWait * 1000;
    assert.equal((await post()).status, 400);
    const longer = await post();
    assert.equal(longer.status, 429);
    assert.ok(Number(longer.headers.get('retry-after')) > firstWait, 'each further failure waits longer');
});

test('Google sign-in is rate limited before the identity is verified', async t => {
    const { store } = tempStore(t);
    let verifications = 0;
    const { call } = await startServer(t, { store, limits: { authPerIp: 2 },
        verifyGoogle: async token => { verifications++; return { uid: 'google_' + token, email: token + '@example.invalid', provider: 'google', name: token }; } });
    assert.equal((await call('/api/auth/google', { credential: 'a' })).status, 200);
    assert.equal((await call('/api/auth/google', { credential: 'a' })).status, 200);
    assert.equal((await call('/api/auth/google', { credential: 'a' })).status, 429);
    assert.equal(verifications, 2);
});

test('check-license reveals state only to the owner; unclaimed and unknown keys look the same', async t => {
    const { store } = tempStore(t);
    const issued = keys.generateKey('annual'), unclaimed = keys.generateKey('annual');
    await store.createSale(sale(issued, 'annual'));
    await store.createSale(sale(unclaimed, 'annual'));
    const { call } = await startServer(t, { store });
    assert.equal((await call('/api/claim-license', { key: issued, deviceId: 'dev_owner-device' })).status, 200);
    const owner = await call('/api/check-license', { key: issued, deviceId: 'dev_owner-device' });
    assert.equal(owner.data.valid, true);
    assert.equal(owner.data.isOwner, true);
    assert.equal(owner.data.plan, 'annual');
    const answers = [];
    for (const [key, deviceId] of [[issued, 'dev_stranger1'], [unclaimed, 'dev_stranger1'], [keys.generateKey('annual'), 'dev_stranger1'], ['garbage', 'dev_stranger1']]) {
        const response = await call('/api/check-license', { key, deviceId }, { ip: '192.0.2.' + answers.length });
        answers.push(JSON.stringify([response.status, response.data]));
    }
    assert.equal(new Set(answers).size, 1, 'issued-but-unused keys are indistinguishable from unknown ones');
    assert.doesNotMatch(answers[0], /claimed|plan|expires/);
});

test('single-key lookups do not read whole tables on the license routes', async t => {
    const { store } = tempStore(t);
    const key = keys.generateKey('monthly');
    const record = sale(key);
    await store.createSale(record);
    let fullReads = 0;
    const counted = Object.assign(Object.create(Object.getPrototypeOf(store)), store, {
        getSold: async () => { fullReads++; return store.getSold(); },
        getClaimed: async () => { fullReads++; return store.getClaimed(); }
    });
    const { call } = await startServer(t, { store: counted });
    await call('/api/check-license', { key, deviceId: 'dev_someone' });
    assert.equal(fullReads, 0);
    assert.deepEqual(await store.getLicense(key), { sale: record, claim: null });
    assert.equal(await store.getLicense(keys.generateKey('monthly')), null);
});

test('a refund after delivery revokes the key; claims and checks then fail, subscriptions drop it', async t => {
    const { store } = tempStore(t);
    const mails = [];
    const service = createFulfillmentService({ store, products: { '51736039': { plan: 'monthly', currency: 'TRY' } },
        generateKey: keys.generateKey, sendEmail: async (...args) => { mails.push(args); return true; } });
    const order = { id: 'refund-order', paymentStatus: 'paid', currency: 'TRY',
        shippingInfo: { email: 'buyer@example.invalid', firstName: 'Ada' }, lineItems: [{ productId: '51736039', quantity: 1 }] };
    assert.equal((await service.fulfill(order)).status, 'delivered');
    const key = (await store.getSold())[0].licenseKey;
    const { call } = await startServer(t, { store });
    assert.equal((await call('/api/claim-license', { key, deviceId: 'dev_buyer-phone' })).status, 200);
    // Same refund signals the first delivery already checks.
    assert.equal((await service.fulfill({ ...order, refunds: [{ amount: 40 }] })).status, 'revoked');
    assert.equal((await service.fulfill({ ...order, refunds: [{ amount: 40 }] })).status, 'already_revoked');
    assert.equal((await service.fulfill({ ...order, id: 'never-sold', cancelled: true })).status, 'not_paid');
    const claim = await call('/api/claim-license', { key, deviceId: 'dev_buyer-phone' });
    assert.equal(claim.status, 410);
    assert.equal(claim.data.code, 'revoked');
    const check = await call('/api/check-license', { key, deviceId: 'dev_buyer-phone' });
    assert.equal(check.data.valid, false);
    assert.equal(check.data.revoked, true);
    assert.equal(mails.length, 1);
    // An account-bound claim disappears from the account subscription.
    const other = keys.generateKey('annual');
    await store.createSale(sale(other, 'annual', 'second-order'));
    await store.claim(other, { key: other, uid: 'google_x', plan: 'annual', claimedAt: Date.now(), expiresAt: Date.now() + 86400000 });
    assert.ok(await store.getSubscription('google_x', Date.now()));
    await store.revokeOrder('second-order', { reason: 'manual' });
    assert.equal(await store.getSubscription('google_x', Date.now()), null);
});

test('license e-mails escape buyer names, plan names and keys', () => {
    for (const currency of ['TRY', 'USD']) {
        const { html } = buildLicenseEmail('<img src=x onerror=alert(1)>"Ada"', 'RESERVE-<b>', '<i>plan</i>', currency);
        assert.doesNotMatch(html, /<img src=x|RESERVE-<b>|<i>plan/);
        assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;&quot;Ada&quot;/);
        assert.match(html, /RESERVE-&lt;b&gt;/);
    }
});

test('AI errors return fixed texts and a configurable daily ceiling stops all callers', async t => {
    const { store } = tempStore(t);
    let calls = 0;
    const aiAssistant = { respond: async () => { calls++; throw Object.assign(new Error('upstream secret: sk-test details'), { status: 500 }); } };
    const { call } = await startServer(t, { store, aiAssistant, limits: { aiDaily: 3 } });
    const first = await call('/api/ai-assistant', { message: 'hi' }, { ip: '198.51.100.20' });
    assert.equal(first.status, 502);
    assert.doesNotMatch(JSON.stringify(first.data), /secret|sk-test/);
    await call('/api/ai-assistant', { message: 'hi' }, { ip: '198.51.100.21' });
    await call('/api/ai-assistant', { message: 'hi' }, { ip: '198.51.100.22' });
    const capped = await call('/api/ai-assistant', { message: 'hi' }, { ip: '198.51.100.23' });
    assert.equal(capped.status, 429);
    assert.match(capped.data.reason, /bugünlük/);
    assert.equal(calls, 3);
});

test('a signed-in account can delete its cloud backup and sessions; the license stays usable', async t => {
    const { store } = tempStore(t);
    const { call } = await startServer(t, { store,
        verifyGoogle: async token => ({ uid: 'google_' + token, email: token + '@example.invalid', provider: 'google', name: token }) });
    const login = await call('/api/auth/google', { credential: 'alice' });
    const auth = { Authorization: 'Bearer ' + login.data.token };
    assert.equal((await call('/api/account/backup', { data: { favorites: ['11000'], customs: [], shopping: [], selected: [] }, revision: 0 }, { method: 'PUT', headers: auth })).status, 200);
    const key = keys.generateKey('lifetime');
    await store.createSale(sale(key, 'lifetime'));
    assert.equal((await call('/api/claim-license', { key, deviceId: 'dev_alice-laptop' }, { headers: auth })).status, 200);
    assert.equal((await call('/api/account', undefined, { method: 'DELETE' })).status, 401);
    const deleted = await call('/api/account', undefined, { method: 'DELETE', headers: auth });
    assert.equal(deleted.status, 200);
    assert.equal(await store.getBackup('google_alice'), null);
    assert.equal((await call('/api/account', undefined, { method: 'GET', headers: auth })).status, 401);
    const claim = (await store.getClaimed())[key];
    assert.equal(claim.uid, 'google_alice');
    assert.equal(claim.email, '');
});

// --- client re-validation (reserve.js in an isolated realm; fetch is always stubbed) ---
function client(initial = {}) {
    const storage = new Map(Object.entries(initial));
    const requests = [];
    const context = vm.createContext({
        URL, crypto: webcrypto, atob, setTimeout: () => 1, clearTimeout: () => {},
        localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
        fetch: async () => { throw new Error('offline'); }
    });
    for (const file of ['auth.js', 'reserve.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    const respond = (status, data) => { context.fetch = async (...args) => { requests.push(args); return { ok: status < 300, status, json: async () => data }; }; };
    return { storage, requests, reserve: context.BarReserve, respond, context };
}

test('earlier activations are kept, re-confirmed with the server and dropped only on an explicit rejection', async () => {
    const key = keys.generateKey('annual');
    const legacy = { barcepte_reserve_active: 'true', barcepte_reserve_license: key, barcepte_reserve_plan: 'annual' };
    // Network failure: nothing is deleted.
    const offline = client(legacy);
    assert.equal(offline.reserve.isReserveActive(), false);
    assert.equal((await offline.reserve.revalidate()).status, 'kept');
    assert.equal(offline.storage.get('barcepte_reserve_license'), key);
    // Server confirms: the legacy state becomes a verified entitlement.
    const confirmed = client(legacy);
    confirmed.respond(200, { success: true, plan: 'annual', expiresAt: Date.now() + 86400000 * 300, restored: true });
    assert.equal((await confirmed.reserve.revalidate()).status, 'confirmed');
    assert.equal(confirmed.reserve.isReserveActive(), true);
    assert.equal(JSON.parse(confirmed.requests[0][1].body).key, key);
    // Fresh entitlements are not re-checked until a day has passed.
    assert.equal((await confirmed.reserve.revalidate()).status, 'fresh');
    // Server errors and rate limits keep a verified entitlement.
    for (const [status, data] of [[503, { success: false }], [429, { success: false, code: 'rate_limited' }], [500, {}]]) {
        confirmed.respond(status, data);
        assert.equal((await confirmed.reserve.revalidate({ force: true })).status, 'kept');
        assert.equal(confirmed.reserve.isReserveActive(), true);
    }
    // Explicit revocation removes it.
    confirmed.respond(410, { success: false, code: 'revoked' });
    assert.equal((await confirmed.reserve.revalidate({ force: true })).status, 'removed');
    assert.equal(confirmed.reserve.isReserveActive(), false);
    assert.equal(confirmed.storage.has('barcepte_reserve_entitlement'), false);
    // A 400 without a rejection code (e.g. malformed request) is not treated as "invalid key".
    const other = client(legacy);
    other.respond(400, { success: false, reason: 'Geçersiz istek.' });
    assert.equal((await other.reserve.revalidate()).status, 'kept');
    assert.equal(other.storage.get('barcepte_reserve_license'), key);
});
