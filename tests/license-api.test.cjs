const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { generateKey, checksum } = require('../scripts/generate-keys');

test('Production API protects issued licenses, admin data and webhook requests', async t => {
    const os = require('os');
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-test-'));
    const previousDir = process.env.LICENSE_DATA_DIR;
    const previousAdmin = process.env.ADMIN_TOKEN;
    process.env.LICENSE_DATA_DIR = dataDir;
    process.env.ADMIN_TOKEN = 'test-admin-token';
    const testKey = generateKey('monthly');
    fs.writeFileSync(path.join(dataDir, 'sold_licenses.json'), JSON.stringify([
        { orderId: 'test-order', licenseKey: testKey, planType: 'monthly' }
    ]));
    const { server } = require('../scripts/shopier-webhook');
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dataDir, { recursive: true, force: true });
        if (previousDir === undefined) delete process.env.LICENSE_DATA_DIR;
        else process.env.LICENSE_DATA_DIR = previousDir;
        if (previousAdmin === undefined) delete process.env.ADMIN_TOKEN;
        else process.env.ADMIN_TOKEN = previousAdmin;
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const claim = async params => {
        const response = await fetch(origin + '/api/claim-license', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return { status: response.status, data: await response.json() };
    };
    const alice = await claim({ key: testKey, deviceId: 'alice-phone' });
    assert.equal(alice.status, 200);
    assert.equal(alice.data.plan, 'monthly');
    const bob = await claim({ key: testKey, deviceId: 'bob-phone' });
    assert.equal(bob.status, 409);
    const restored = await claim({ key: testKey, deviceId: 'alice-phone' });
    assert.equal(restored.data.restored, true);
    assert.equal(restored.data.expiresAt, alice.data.expiresAt);
    const unissued = await claim({ key: generateKey('annual'), deviceId: 'alice-phone' });
    assert.equal(unissued.status, 400);
    assert.equal(unissued.data.success, false);
    assert.equal((await claim({ key: 'RESERVE-SULUNCA-2026', deviceId: 'alice-phone' })).status, 400);
    assert.equal((await claim({key:testKey,uid:'forged-alice',deviceId:'alice-phone'})).status,401);
    const claimsPath = path.join(dataDir, 'claimed_licenses.json');
    const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
    claims[testKey].expiresAt = Date.now() - 1000;
    fs.writeFileSync(claimsPath, JSON.stringify(claims));
    const expired = await claim({ key: testKey, deviceId: 'alice-phone' });
    assert.equal(expired.status, 400);
    assert.match(expired.data.reason, /süresi dolmuştur/);
    fs.writeFileSync(claimsPath, '{broken');
    assert.equal((await claim({key: testKey, deviceId: 'bob-phone'})).status, 500);
    assert.equal(fs.readFileSync(claimsPath, 'utf8'), '{broken');
    fs.writeFileSync(claimsPath, JSON.stringify(claims));
    for (const body of [null, [], {key: {}}, {key: testKey}]) {
        assert.equal((await claim(body)).status, 400);
    }
    for (const route of ['/licenses', '/dashboard', '/resend?orderId=test-order']) {
        assert.equal((await fetch(origin + route)).status, 401);
    }
    assert.equal((await fetch(origin + '/api/resend-license', {method: 'POST'})).status, 401);
    assert.equal((await fetch(origin + '/webhook/shopier', {method: 'POST'})).status, 401);
    const headers = {Authorization: 'Basic ' + Buffer.from('admin:test-admin-token').toString('base64')};
    assert.equal((await fetch(origin + '/licenses', {headers})).status, 200);
    assert.equal((await fetch(origin + '/resend?orderId=test-order', {headers})).status, 405);
});

test('Backend shopier-webhook sanitization prevents XSS and parses JSON safely', () => {
    const { escapeHtml, readJsonBody } = require('../scripts/shopier-webhook');
    assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.equal(escapeHtml('Alperen & Friends \'VIP\''), 'Alperen &amp; Friends &#39;VIP&#39;');
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(typeof readJsonBody, 'function');
});

test('Electron desktop main.js server allows all essential application assets', () => {
    const assets = require('../web-assets.json');
    const packaged = require('../package.json').build.files;
    for (const asset of assets) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), `missing asset: ${asset}`);
        assert.ok(packaged.includes(asset), `not packaged: ${asset}`);
    }
    const mainContent = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
    assert.match(mainContent, /require\('\.\/web-assets\.json'\)/);
    assert.match(mainContent, /'\.mp4': 'video\/mp4'/);
});

test('Frontend support and ingredient resolution are robust against missing elements and languages', () => {
    const gameJs = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
    const supportJs = fs.readFileSync(path.join(__dirname, '..', 'support.js'), 'utf8');

    // support.js guards supportCloseBtn
    assert.match(supportJs, /const supportCloseBtn = document\.getElementById\('support-close'\);/);
    assert.match(supportJs, /if \(supportCloseBtn\)/);

    // game.js resolveIngredientName checks pi.nameEn
    assert.match(gameJs, /pi\.nameEn && pi\.nameEn\.toLowerCase\(\) === n/);

    // game.js smart advice and substitutes localize in English
    assert.match(gameJs, /currentLang === 'en' \? bestIng : translateIngredientName\(bestIng\)/);
    assert.match(gameJs, /subEn: 'Cointreau or Orange Liqueur'/);
});

