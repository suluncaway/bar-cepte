// Rate-limit internals (proxy hops, IPv6 grouping, backoff that a success cannot reset, timed
// pruning with a hard cap), the uniform anonymous claim rejection, partial refunds and the key
// generator's --save warning. Nothing here contacts Render, Shopier, Resend or Google.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const rl = require('../scripts/rate-limit');
const keys = require('../scripts/generate-keys');
const { createFileStore } = require('../scripts/license-store');
const { createServer } = require('../scripts/shopier-webhook');
const { createFulfillmentService } = require('../scripts/order-fulfillment');

const req = (xff, remoteAddress = '10.9.8.7') => ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress } });

test('client address honours TRUST_PROXY_HOPS and ignores spoofed X-Forwarded-For entries', () => {
    assert.equal(rl.trustProxyHops({}), 1);
    assert.equal(rl.trustProxyHops({ TRUST_PROXY_HOPS: '0' }), 0);
    assert.equal(rl.trustProxyHops({ TRUST_PROXY_HOPS: '2' }), 2);
    assert.equal(rl.trustProxyHops({ TRUST_PROXY_HOPS: 'junk' }), 1);
    const spoofed = req('6.6.6.6, 203.0.113.9');
    assert.equal(rl.clientIp(spoofed, 1), '203.0.113.9');
    assert.equal(rl.clientIp(spoofed, 2), '6.6.6.6');
    assert.equal(rl.clientIp(spoofed, 0), '10.9.8.7', 'hops=0 uses the TCP peer');
    assert.equal(rl.clientIp(req(undefined), 1), '10.9.8.7');
    assert.equal(rl.clientIp(req('not-an-ip'), 1), '10.9.8.7');
    assert.equal(rl.clientIp(req('203.0.113.9', '::ffff:127.0.0.1'), 0), '127.0.0.1');
});

test('IPv6 addresses share one bucket per /64; IPv4-mapped addresses count as IPv4', () => {
    const a = rl.addressBucket('2001:db8:1:2:aaaa::1');
    assert.equal(a, '2001:db8:1:2::/64');
    assert.equal(rl.addressBucket('2001:0db8:0001:0002:ffff:ffff:ffff:ffff'), a);
    assert.equal(rl.addressBucket('[2001:db8:1:2::9]'), a);
    assert.equal(rl.addressBucket('fe80::1%eth0'), 'fe80:0:0:0::/64');
    assert.notEqual(rl.addressBucket('2001:db8:1:3::1'), a);
    assert.equal(rl.addressBucket('::ffff:198.51.100.7'), '198.51.100.7');
    assert.equal(rl.addressBucket('::ffff:c633:6407'), '198.51.100.7');
    assert.equal(rl.addressBucket('::1'), '0:0:0:0::/64');
    assert.equal(rl.addressBucket('1:2:3'), null);
    assert.equal(rl.addressBucket('1::2::3'), null);
});

test('a successful claim forgives at most one failure and never lifts a lockout', () => {
    let now = 1_800_000_000_000;
    const backoff = rl.createFailureBackoff({ now: () => now });
    for (let i = 0; i < 6; i++) backoff.fail('ip');
    assert.equal(backoff.check('ip').ok, false, 'sixth failure locks');
    backoff.succeed('ip');
    assert.equal(backoff.check('ip').ok, false, 'success does not clear the lockout');
    now += 2000;
    assert.equal(backoff.check('ip').ok, true);
    backoff.succeed('ip'); backoff.succeed('ip'); backoff.succeed('ip');
    backoff.fail('ip');
    const first = backoff.check('ip');
    assert.equal(first.ok, false, 'repeated successes forgave only one failure');
    // Interleaving one's own key with guesses keeps the waits growing.
    const waits = [];
    for (let i = 0; i < 4; i++) {
        now += 16 * 60 * 1000;
        backoff.succeed('ip'); backoff.fail('ip');
        waits.push(backoff.check('ip').retryAfter);
    }
    assert.ok(waits.every((w, i) => i === 0 || w >= waits[i - 1]));
    assert.ok(waits.at(-1) > 2);
    // The budget belongs to a time window: after the retention period it starts over.
    now += 24 * 60 * 60 * 1000;
    assert.equal(backoff.check('ip').ok, true);
    assert.equal(backoff.size, 0, 'expired rows are dropped');
});

test('limiters drop expired rows on a timer-like sweep and hold a hard maximum of addresses', () => {
    let now = 0;
    const limiter = rl.createWindowLimiter({ windowMs: 1000, perKey: 1, now: () => now, maxKeys: 3, sweepMs: 500 });
    for (const ip of ['a', 'b', 'c']) assert.equal(limiter.take(ip).ok, true);
    assert.equal(limiter.take('a').ok, false);
    assert.equal(limiter.take('d').ok, true);
    assert.equal(limiter.size, 3, 'the oldest address was evicted at the cap');
    assert.equal(limiter.take('a').ok, true, 'evicted address starts over');
    now = 1500;
    limiter.sweep();
    assert.equal(limiter.size, 0, 'rows past their window are deleted');
    limiter.stop();
    const backoff = rl.createFailureBackoff({ now: () => now, maxKeys: 2, forgetMs: 1000 });
    backoff.fail('x'); backoff.fail('y'); backoff.fail('z');
    assert.equal(backoff.size, 2);
    now += 1000; backoff.sweep();
    assert.equal(backoff.size, 0);
    backoff.stop();
});

test('pruning 50 000 addresses is linear, not quadratic', () => {
    let now = 0;
    const limiter = rl.createWindowLimiter({ windowMs: 60_000, perKey: 5, now: () => now, sweepMs: 1000 });
    const started = process.hrtime.bigint();
    for (let i = 0; i < 50_000; i++) { now++; limiter.take('198.' + (i >> 16) + '.' + ((i >> 8) & 255) + '.' + (i & 255)); }
    const filled = Number(process.hrtime.bigint() - started) / 1e6;
    assert.equal(limiter.size, 50_000);
    now += 60_000;
    const sweepStart = process.hrtime.bigint();
    limiter.sweep();
    const swept = Number(process.hrtime.bigint() - sweepStart) / 1e6;
    assert.equal(limiter.size, 0);
    assert.ok(filled < 2000, `50k inserts took ${filled} ms`);
    assert.ok(swept < 500, `sweep took ${swept} ms`);
    limiter.stop();
});

function tempStore(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-server-hardening-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return createFileStore(dir);
}

async function startServer(t, options) {
    const server = createServer(options);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    return async (route, body, { ip = '198.51.100.1', headers = {} } = {}) => {
        const started = Date.now();
        const response = await fetch(origin + route, { method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...headers }, body: JSON.stringify(body) });
        return { status: response.status, data: await response.json(), ms: Date.now() - started };
    };
}

test('anonymous claims get one answer for unknown, foreign and revoked keys, after the same delay', async t => {
    const store = tempStore(t);
    const owned = keys.generateKey('annual'), revoked = keys.generateKey('annual');
    await store.createSale({ orderId: 'o-owned', licenseKey: owned, planType: 'annual', email: 'a@example.invalid' });
    await store.createSale({ orderId: 'o-revoked', licenseKey: revoked, planType: 'annual', email: 'a@example.invalid' });
    await store.revokeOrder('o-revoked', { reason: 'refund' });
    const call = await startServer(t, { store, rejectionFloorMs: 120,
        verifyGoogle: async token => ({ uid: 'google_' + token, email: token + '@example.invalid', provider: 'google', name: token }) });
    assert.equal((await call('/api/claim-license', { key: owned, deviceId: 'dev_owner-1' })).status, 200);
    const answers = [];
    for (const [i, key] of [owned, revoked, keys.generateKey('annual')].entries()) {
        const r = await call('/api/claim-license', { key, deviceId: 'dev_stranger' }, { ip: '192.0.2.' + (i + 1) });
        assert.ok(r.ms >= 110, `rejection padded (${r.ms} ms)`);
        answers.push(JSON.stringify([r.status, r.data]));
    }
    assert.equal(new Set(answers).size, 1);
    const [status, data] = JSON.parse(answers[0]);
    assert.equal(status, 400);
    assert.equal(data.code, 'not_issued', 'a code the current client already treats as an explicit rejection');
    // Signed-in callers keep the precise answer (and new 130-bit keys still activate as before).
    const token = (await call('/api/auth/google', { credential: 'bob' })).data.token;
    const auth = { headers: { Authorization: 'Bearer ' + token }, ip: '192.0.2.50' };
    assert.equal((await call('/api/claim-license', { key: owned, deviceId: 'dev_bob' }, auth)).data.code, 'claimed_elsewhere');
    const fresh = keys.generateKey('lifetime');
    await store.createSale({ orderId: 'o-fresh', licenseKey: fresh, planType: 'lifetime', email: 'other@example.invalid' });
    assert.equal((await call('/api/claim-license', { key: fresh, deviceId: 'dev_anon-2' }, { ip: '192.0.2.60' })).status, 200);
});

test('a successful claim cannot reset the guessing backoff of an address', async t => {
    const store = tempStore(t);
    const mine = keys.generateKey('monthly');
    await store.createSale({ orderId: 'o-mine', licenseKey: mine, planType: 'monthly', email: 'm@example.invalid' });
    const call = await startServer(t, { store, rejectionFloorMs: 0, limits: { licensePerIp: 100 } });
    const ip = '203.0.113.77';
    assert.equal((await call('/api/claim-license', { key: mine, deviceId: 'dev_attacker' }, { ip })).status, 200);
    const seen = [];
    for (let i = 0; i < 8; i++) {
        seen.push((await call('/api/claim-license', { key: keys.generateKey('monthly'), deviceId: 'dev_attacker' }, { ip })).status);
        seen.push((await call('/api/claim-license', { key: mine, deviceId: 'dev_attacker' }, { ip })).status);
    }
    assert.ok(seen.includes(429), 'interleaved own-key claims do not keep the address unlocked: ' + seen.join(','));
});

test('IPv6 callers in one /64 share a claim budget', async t => {
    const store = tempStore(t);
    const call = await startServer(t, { store, rejectionFloorMs: 0, limits: { licensePerIp: 2 } });
    const statuses = [];
    for (const ip of ['2001:db8:aa:bb::1', '2001:db8:aa:bb::2', '2001:db8:aa:bb:0:0:abcd:1', '2001:db8:aa:bb:ffff:ffff:ffff:ffff']) {
        statuses.push((await call('/api/claim-license', { key: keys.generateKey('monthly'), deviceId: 'dev_v6-user' }, { ip })).status);
    }
    assert.deepEqual(statuses, [400, 400, 429, 429]);
    assert.equal((await call('/api/claim-license', { key: keys.generateKey('monthly'), deviceId: 'dev_v6-user' }, { ip: '2001:db8:aa:bc::1' })).status, 400);
});

test('only a refund of the license line revokes the key', async t => {
    const store = tempStore(t);
    const products = { '51736039': { plan: 'monthly', currency: 'TRY' } };
    const service = createFulfillmentService({ store, products, generateKey: keys.generateKey, sendEmail: async () => true });
    const order = { id: 'mixed', paymentStatus: 'paid', currency: 'TRY', shippingInfo: { email: 'x@example.invalid' },
        lineItems: [{ id: 'L1', productId: '51736039', quantity: 1 }, { id: 'L2', productId: 'mug', quantity: 1 }] };
    assert.equal((await service.fulfill(order)).status, 'delivered');
    // Refund of the other line (by line id or product id) keeps the key.
    assert.equal((await service.fulfill({ ...order, refunds: [{ lineItems: [{ id: 'L2', productId: 'mug' }] }] })).status, 'already_processed');
    assert.equal((await service.fulfill({ ...order, returns: [{ lineItemId: 'L2' }] })).status, 'already_processed');
    // An amount-only refund on a mixed order cannot be attributed: it waits for the administrator.
    assert.equal((await service.fulfill({ ...order, refunds: [{ amount: 5 }] })).status, 'refund_needs_review');
    assert.equal((await store.getSale('mixed')).revoked, undefined);
    // Refunding the license line revokes it.
    assert.equal((await service.fulfill({ ...order, refunds: [{ lineItemId: 'L1' }] })).status, 'revoked');
    assert.equal((await store.getSale('mixed')).revoked, true);
    // Cancelling the whole order, or any refund of a license-only order, revokes as before.
    const single = { ...order, id: 'single', lineItems: [{ productId: '51736039', quantity: 1 }] };
    assert.equal((await service.fulfill(single)).status, 'delivered');
    assert.equal((await service.fulfill({ ...single, refunds: [{ amount: 1 }] })).status, 'revoked');
    const other = { ...order, id: 'cancelled' };
    assert.equal((await service.fulfill(other)).status, 'delivered');
    assert.equal((await service.fulfill({ ...other, cancelled: true })).status, 'revoked');
});

test('generate-keys warns that unsaved keys never activate and only advertises delivery after --save', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-keys-cli-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const env = { ...process.env, LICENSE_DATA_DIR: dir, NODE_ENV: 'test' };
    delete env.DATABASE_URL;
    const script = path.join(__dirname, '..', 'scripts', 'generate-keys.js');
    const run = args => execFileSync(process.execPath, [script, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const { spawnSync } = require('node:child_process');
    const unsaved = spawnSync(process.execPath, [script, 'monthly', '1'], { env, encoding: 'utf8' });
    assert.match(unsaved.stderr, /KAYDEDİLMEDİ ve asla etkinleşmez/);
    assert.doesNotMatch(unsaved.stdout + unsaved.stderr, /Shopier otomatik dijital ürün teslimatına/);
    const saved = run(['annual', '1', '--save']);
    assert.match(saved, /sunucu siciline kaydedildi/);
    assert.match(saved, /Shopier otomatik dijital ürün teslimatına/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'sold_licenses.json'), 'utf8')).length, 1);
});
