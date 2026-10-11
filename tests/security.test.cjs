const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const security = require('../security.js');
const valid = {
    idDrink: 'custom_123', strDrink: 'Test', strInstructions: 'Karıştır',
    customIngredients: ['Gin'], strDrinkThumb: '', strAlcoholic: 'Alcoholic'
};
test('normal backup retains valid recipe and Turkish strings', () => {
    const result = security.backup({ customs: [valid], shopping: ['Şeker'], favorites: ['123'], selected: ['Gin'] });
    assert.equal(result.customs[0].strDrink, 'Test');
    assert.equal(result.shopping[0], 'Şeker');
});
test('malformed and oversized backup fields are rejected', () => {
    for (const payload of [null, [], {shopping: [{}]}, {customs: [{}]}, {selected: ['a'.repeat(201)]}]) {
        assert.throws(() => security.backup(payload));
    }
    assert.throws(() => security.backup({customs: Array(301).fill(valid)}));
});
test('injected recipe IDs and duplicate IDs are rejected', () => {
    assert.throws(() => security.recipe({...valid, idDrink: "custom_');alert(1);//"}));
    assert.throws(() => security.recipes([valid, valid]));
});
test('unknown computed HTML/class fields never survive import', () => {
    const result = security.recipe({...valid, computedABV: {badgeCls: '"><img onerror=alert(1)>'}});
    assert.equal(result.computedABV, undefined);
});
test('image protocols and origins are allowlisted', () => {
    for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://tracker.invalid/x',
        'https://www.thecocktaildb.com.evil.invalid/images/a', 'https://attacker.invalid/x']) {
        assert.equal(security.safeImage(url), '');
    }
    assert.ok(security.safeImage('data:image/png;base64,aGVsbG8='));
    assert.ok(security.safeImage('https://www.thecocktaildb.com/images/media/drink/a.jpg'));
});
test('release links cannot leave the expected repository', () => {
    assert.equal(security.releaseURL('javascript:alert(1)'), 'https://github.com/suluncaway/bar-cepte/releases/latest');
    assert.equal(security.releaseURL('https://github.com/attacker/repo/releases/a'), 'https://github.com/suluncaway/bar-cepte/releases/latest');
});
test('malformed or inaccessible local storage does not crash startup', () => {
    global.localStorage = {getItem: () => '{'};
    assert.deepEqual(security.readStored('test', security.stringList), []);
    global.localStorage = {getItem: () => {throw new Error('blocked');}};
    assert.deepEqual(security.readStored('test', security.stringList), []);
});
test('UI contains no executable inline handlers, scripts or CDN runtime', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const js = fs.readFileSync('game.js', 'utf8');
    assert.doesNotMatch(html, /\son(?:click|input|error)\s*=/);
    assert.doesNotMatch(html, /<script\s*>/);
    assert.doesNotMatch(js, /\son(?:click|error)\s*=/);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
    assert.match(html, /script-src-attr 'none'/);
    assert.match(html, /object-src 'none'/);
});
test('support buttons open the owner-confirmed profile with opener isolation', () => {
    const vm = require('node:vm');
    const handlers = [];
    const opened = [];
    const button = { addEventListener: (type, handler) => handlers.push(handler) };
    const sandbox = {
        URL,
        document: {
            querySelectorAll: selector => selector === '[data-support-button]' ? [button, button] : [],
            getElementById: () => ({addEventListener: () => {}})
        },
        window: {open: (...args) => opened.push(args)}
    };
    vm.runInNewContext(fs.readFileSync('support.js', 'utf8'), sandbox);
    handlers.forEach(handler => handler());
    assert.equal(opened.length, 2);
    for (const args of opened) {
        assert.deepEqual(args, ['https://buymeacoffee.com/suluncau', '_blank', 'noopener,noreferrer']);
    }
});
test('original user-supplied coffee widget is preserved with a narrow CSP exception', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const snippet = '<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="suluncau" data-color="#FFDD00" data-emoji=""  data-font="Bree" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff" ></script>';
    assert.ok(html.includes(snippet));
    assert.equal(html.split(snippet).length - 1, 1);
    assert.match(html, /script-src 'self' https:\/\/cdnjs\.buymeacoffee\.com\/1\.0\.0\/button\.prod\.min\.js/);
    assert.doesNotMatch(html, /coffee-support-link|coffee-support-cup/);
    assert.match(html, /script-src-attr 'none'/);
});
test('Google AdSense integration and CSP exceptions are configured correctly', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert.match(html, /https:\/\/pagead2\.googlesyndication\.com/);
    assert.match(html, /frame-src [^;]*https:\/\/googleads\.g\.doubleclick\.net/);
    assert.match(html, /frame-src [^;]*https:\/\/pagead2\.googlesyndication\.com/);
    assert.ok(fs.existsSync('ads.txt'));
    assert.ok(fs.existsSync('ads.js'));
});
test('editorial layout keeps all original UI bindings and local-only hero assets', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    for (let i = 0; i < 46; i++) {
        assert.equal(html.split(`data-ui="ui-${i}"`).length - 1, 1, `ui-${i} must exist once`);
    }
    assert.match(html, /src="editorial-cocktails.webp"/);
    assert.match(html, /src="editorial-ui.js"/);
    assert.match(html, /id="editorial-picks-grid"/);
    assert.ok(fs.existsSync('editorial-cocktails.webp'));
});
test('Bar Cepte Reserve membership module validates keys and updates state', () => {
    const reserve = require('../reserve.js');
    assert.ok(reserve.validateLicenseKey('RESERVE-SULUNCA-2026'));
    assert.ok(reserve.validateLicenseKey('BARCEPTE-RESERVE-VIP'));
    assert.equal(reserve.validateLicenseKey('INVALID-KEY'), false);
    assert.equal(reserve.validateLicenseKey('RESERVE-1111-2222-3333'), false);
    assert.ok(fs.existsSync('reserve.js'));
    assert.ok(fs.existsSync('scripts/generate-keys.js'));
});
test('Reserve UI elements and modal are present in index.html', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert.match(html, /id="btn-open-reserve"/);
    assert.match(html, /id="reserve-modal"/);
    assert.match(html, /src="reserve\.js"/);
});
test('Reserve UI elements and modal are responsive on mobile without overflow', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const css = fs.readFileSync('style.css', 'utf8');
    assert.match(html, /id="reserve-btn-label"[^>]*class="[^"]*hidden sm:inline/);
    assert.match(html, /id="reserve-key-input"[^>]*min-w-0/);
    assert.match(css, /#reserve-modal/);
    assert.match(css, /#btn-open-reserve/);
});
test('alcohol subcategory filter chips and grouping are present in index.html and game.js', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const js = fs.readFileSync('game.js', 'utf8');
    assert.match(html, /id="alcohol-subcategories"/);
    assert.match(html, /data-action="alcohol-subcat"/);
    assert.match(js, /function getAlcoholGroup/);
    assert.match(js, /function setAlcoholSubCategory/);
});
test('Reserve subscription plans and dynamic elements are present in index.html and reserve.js', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const reserve = require('../reserve.js');

    assert.match(html, /data-plan="monthly"/);
    assert.match(html, /data-plan="annual"/);
    assert.match(html, /data-plan="lifetime"/);
    assert.match(html, /id="reserve-plan-title"/);
    assert.match(html, /id="reserve-plan-price"/);
    assert.match(html, /id="reserve-active-plan-badge"/);
    assert.match(html, /id="reserve-active-duration"/);

    assert.ok(reserve.PLANS_CONFIG.monthly);
    assert.ok(reserve.PLANS_CONFIG.annual);
    assert.ok(reserve.PLANS_CONFIG.lifetime);
    assert.equal(reserve.PLANS_CONFIG.monthly.shopierUrl, 'https://www.shopier.com/Anawin/51736039');
    assert.equal(reserve.PLANS_CONFIG.annual.shopierUrl, 'https://www.shopier.com/Anawin/51735632');
    assert.equal(reserve.getPlanDisplayName('monthly'), 'Aylık Abonelik (Monthly Pass)');
    assert.equal(reserve.getPlanDisplayName('annual'), 'Yıllık Abonelik (Annual Pass)');
    assert.equal(reserve.getPlanDisplayName('lifetime'), 'Ömür Boyu VIP (Lifetime Pass)');
});
test('Reserve key generation and validation works for monthly, annual, and lifetime plans', () => {
    const reserve = require('../reserve.js');
    const { execSync } = require('node:child_process');

    const output = execSync(`"${process.execPath}" scripts/generate-keys.js --plan=all --count=1`, { encoding: 'utf8' });
    assert.match(output, /monthly:/);
    assert.match(output, /annual:/);
    assert.match(output, /lifetime:/);

    const mthMatch = output.match(/monthly:\s+(RESERVE-MTH1-[A-Z0-9]+-[A-Z0-9]+)/);
    const annMatch = output.match(/annual:\s+(RESERVE-ANN1-[A-Z0-9]+-[A-Z0-9]+)/);
    const lifeMatch = output.match(/lifetime:\s+(RESERVE-LIFE-[A-Z0-9]+-[A-Z0-9]+)/);

    assert.ok(mthMatch);
    assert.ok(annMatch);
    assert.ok(lifeMatch);

    assert.ok(reserve.validateLicenseKey(mthMatch[1]));
    assert.ok(reserve.validateLicenseKey(annMatch[1]));
    assert.ok(reserve.validateLicenseKey(lifeMatch[1]));

    assert.equal(reserve.getPlanFromKey(mthMatch[1]), 'monthly');
    assert.equal(reserve.getPlanFromKey(annMatch[1]), 'annual');
    assert.equal(reserve.getPlanFromKey(lifeMatch[1]), 'lifetime');
});

test('BarAuth module validates user data and sanitizes against XSS', () => {
    // Setup dummy localStorage for Node test runner
    const storageMap = new Map();
    global.localStorage = {
        getItem: k => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: k => storageMap.delete(k),
        clear: () => storageMap.clear()
    };

    const auth = require('../auth.js');
    assert.ok(auth);
    assert.equal(auth.isLoggedIn(), false);

    // XSS injection in user profile fields must be sanitized
    const saved = auth.saveUser({
        uid: 'user_test_1',
        name: '<b>Hacker</b><script>alert(1)</script>',
        email: 'attacker@evil.com',
        picture: 'javascript:alert(1)',
        provider: 'google'
    });

    assert.equal(saved.name, 'bHacker/bscriptalert(1)/script');
    assert.doesNotMatch(saved.name, /<script>/);
    assert.equal(saved.picture, ''); // Malicious protocol rejected
    assert.equal(auth.isLoggedIn(), true);
    assert.equal(auth.getCurrentUser().uid, 'user_test_1');

    auth.logout();
    assert.equal(auth.isLoggedIn(), false);
});

test('License keys are strictly single-use and bound to one account', () => {
    const storageMap = new Map();
    global.localStorage = {
        getItem: k => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: k => storageMap.delete(k),
        clear: () => storageMap.clear()
    };

    const auth = require('../auth.js');
    const reserve = require('../reserve.js');

    const key = 'RESERVE-ANN1-TEST-5632';
    // Validate format with real checksum
    const testPart1 = 'ANN1';
    const testPart2 = 'TEST';
    const validKey = `RESERVE-${testPart1}-${testPart2}-${reserve.checksum(testPart1 + testPart2)}`;
    assert.ok(reserve.validateLicenseKey(validKey));

    // User A signs in and claims the key
    auth.saveUser({ uid: 'user_alice', name: 'Alice', email: 'alice@gmail.com' });
    const checkAlice = auth.canUseLicenseKey(validKey);
    assert.equal(checkAlice.allowed, true);

    auth.claimLicenseKey(validKey, 'annual', Date.now() + 365 * 24 * 60 * 60 * 1000);
    assert.equal(auth.getCurrentUser().isReserve, true);
    assert.equal(auth.getCurrentUser().reserveKey, validKey);

    // Alice on another device can still use her own key
    const checkAliceAgain = auth.canUseLicenseKey(validKey);
    assert.equal(checkAliceAgain.allowed, true);
    assert.equal(checkAliceAgain.alreadyClaimed, true);

    // User B tries to use the same key -> MUST BE REJECTED!
    auth.saveUser({ uid: 'user_bob', name: 'Bob', email: 'bob@gmail.com' });
    const checkBob = auth.canUseLicenseKey(validKey);
    assert.equal(checkBob.allowed, false);
    assert.match(checkBob.reason, /tek kullanımlıktır/);

    // reserve.activateReserve also rejects User B
    const reserveResult = reserve.activateReserve(validKey);
    assert.equal(reserveResult, false);
});

test('Google Sign-In UI elements, modals, and CSP directives are present in index.html', () => {
    const html = fs.readFileSync('index.html', 'utf8');

    // CSP allows Google Identity Services, Firebase, and webhook API safely
    assert.match(html, /https:\/\/accounts\.google\.com\/gsi\/client/);
    assert.match(html, /https:\/\/lh3\.googleusercontent\.com/);
    assert.match(html, /frame-src [^;]*https:\/\/accounts\.google\.com\//);
    assert.match(html, /connect-src [^;]*https:\/\/identitytoolkit\.googleapis\.com/);
    assert.match(html, /connect-src [^;]*https:\/\/bar-cepte-webhook\.onrender\.com/);

    // UI elements present
    assert.match(html, /id="btn-auth-user"/);
    assert.match(html, /id="auth-modal"/);
    assert.match(html, /id="google-signin-btn-container"/);
    assert.match(html, /src="firebase-config\.js"/);
    assert.match(html, /src="auth\.js"/);
    assert.match(html, /src="https:\/\/accounts\.google\.com\/gsi\/client"/);
});

test('Expired license keys cannot be reactivated to gain free extra days', () => {
    const storageMap = new Map();
    global.window = global;
    global.localStorage = {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        clear: () => storageMap.clear()
    };

    const auth = require('../auth.js');
    const reserve = require('../reserve.js');

    const expiredKey = `RESERVE-MTH1-EXPR-${reserve.checksum('MTH1EXPR')}`;
    assert.ok(reserve.validateLicenseKey(expiredKey));

    auth.saveUser({ uid: 'user_david', name: 'David', email: 'david@gmail.com' });

    // Claim key with an expiration date in the past
    const pastTime = Date.now() - 10000;
    auth.claimLicenseKey(expiredKey, 'monthly', pastTime);

    // David attempts to reactivate using the same expired key
    const checkExpired = auth.canUseLicenseKey(expiredKey);
    assert.equal(checkExpired.allowed, false);
    assert.match(checkExpired.reason, /kullanım süresi dolmuştur/);

    const activateResult = reserve.activateReserve(expiredKey);
    assert.equal(activateResult, false);
});
