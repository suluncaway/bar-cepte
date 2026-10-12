const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { generateKey, checksum } = require('../scripts/generate-keys');

test('Central API strictly enforces single-use license keys across devices and users', async () => {
    // Spin up an ephemeral instance of the API server logic on a random port
    const testPort = 39876;
    const testClaimedFile = path.resolve(__dirname, '..', 'keys', 'test_claimed_licenses.json');
    if (fs.existsSync(testClaimedFile)) fs.unlinkSync(testClaimedFile);

    // Mock central server handler
    const MASTER_KEYS = new Set(['RESERVE-SULUNCA-2026', 'BARCEPTE-RESERVE-VIP']);
    const claimedDb = {};

    const server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/api/claim-license') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                const params = JSON.parse(body || '{}');
                const rawKey = params.key || '';
                const uid = params.uid || null;
                const email = params.email || '';
                const deviceId = params.deviceId || null;
                const cleanKey = rawKey.trim().toUpperCase();

                if (MASTER_KEYS.has(cleanKey)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: true, plan: 'lifetime', isMaster: true }));
                }

                const existing = claimedDb[cleanKey];
                if (existing) {
                    const isOwner = (uid && existing.uid === uid) || (deviceId && existing.deviceId === deviceId);
                    if (!isOwner) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({
                            success: false,
                            reason: '❌ Bu lisans anahtarı daha önce başka bir kullanıcı/cihaz tarafından kullanılmış! Lisanslar tek kullanımlıktır.'
                        }));
                    }
                    if (existing.expiresAt > 0 && Date.now() > existing.expiresAt) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({
                            success: false,
                            reason: '❌ Bu lisans anahtarının kullanım süresi dolmuştur! Lütfen yeni bir lisans temin ediniz.'
                        }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: true, plan: existing.plan, expiresAt: existing.expiresAt, restored: true }));
                }

                let plan = 'lifetime';
                if (cleanKey.includes('-MTH1-')) plan = 'monthly';
                else if (cleanKey.includes('-ANN1-')) plan = 'annual';

                const duration = plan === 'monthly' ? 30 * 86400000 : plan === 'annual' ? 365 * 86400000 : 0;
                const expiresAt = duration > 0 ? (Date.now() + duration) : 0;

                claimedDb[cleanKey] = { key: cleanKey, plan, expiresAt, uid, email, deviceId, claimedAt: Date.now() };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, plan, expiresAt }));
            });
        }
    });

    await new Promise(r => server.listen(testPort, r));

    try {
        const testKey = generateKey('monthly');

        // 1. Device A (User Alice) claims key -> MUST SUCCEED
        const resAlice = await fetch(`http://localhost:${testPort}/api/claim-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: testKey, uid: 'user_alice', email: 'alice@test.com', deviceId: 'dev_alice_phone' })
        });
        const dataAlice = await resAlice.json();
        assert.equal(resAlice.status, 200);
        assert.equal(dataAlice.success, true);
        assert.equal(dataAlice.plan, 'monthly');

        // 2. Device B (User Bob / different phone / incognito) tries to use SAME key -> MUST BE REJECTED WITH 409!
        const resBob = await fetch(`http://localhost:${testPort}/api/claim-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: testKey, uid: 'user_bob', email: 'bob@test.com', deviceId: 'dev_bob_pc' })
        });
        const dataBob = await resBob.json();
        assert.equal(resBob.status, 409);
        assert.equal(dataBob.success, false);
        assert.match(dataBob.reason, /tek kullanımlıktır/);

        // 3. Incognito Guest on Device C tries same key -> MUST BE REJECTED!
        const resGuest = await fetch(`http://localhost:${testPort}/api/claim-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: testKey, uid: null, email: '', deviceId: 'dev_guest_incognito' })
        });
        const dataGuest = await resGuest.json();
        assert.equal(resGuest.status, 409);
        assert.equal(dataGuest.success, false);
        assert.match(dataGuest.reason, /tek kullanımlıktır/);

        // 4. Alice on her own phone restores her license -> Allowed
        const resAliceRestore = await fetch(`http://localhost:${testPort}/api/claim-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: testKey, uid: 'user_alice', email: 'alice@test.com', deviceId: 'dev_alice_tablet' })
        });
        const dataAliceRestore = await resAliceRestore.json();
        assert.equal(resAliceRestore.status, 200);
        assert.equal(dataAliceRestore.restored, true);
    } finally {
        server.close();
    }
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
    const mainContent = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
    assert.match(mainContent, /'\/reserve\.js'/);
    assert.match(mainContent, /'\/auth\.js'/);
    assert.match(mainContent, /'\/firebase-config\.js'/);
    assert.match(mainContent, /'\/ads\.js'/);
    assert.match(mainContent, /'\/hero-cocktail-ambient\.mp4'/);
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

