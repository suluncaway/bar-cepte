// Sign-out / sign-in on one device: the account's lists leave with it, come back on the next
// sign-in to the same account (merged with the cloud copy), and are never silently emptied.
// Real auth.js against the real account service with a temporary file store; no network.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { createFileStore } = require('../scripts/license-store');
const { createAccountService } = require('../scripts/account-service');
const security = require('../security');

function storage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return { map, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) };
}
function client(service, initial = {}) {
    const local = storage(initial);
    const sandbox = { module: { exports: {} }, console, setTimeout, clearTimeout, AbortController, URL,
        localStorage: local, sessionStorage: storage(), BarSecurity: security, alert() {}, applied: [],
        applyCloudBackup: data => { sandbox.applied.push(JSON.parse(JSON.stringify(data))); },
        fetch: async (url, options = {}) => {
            let status, value;
            const req = { method: options.method || 'GET', headers: Object.fromEntries(Object.entries(options.headers || {}).map(([k, v]) => [k.toLowerCase(), v])) };
            await service.handle(req, { writeHead: s => status = s, end: s => value = JSON.parse(s) }, new URL(url).pathname, async () => options.body ? JSON.parse(options.body) : {});
            return { ok: status >= 200 && status < 300, status, json: async () => value };
        } };
    vm.runInNewContext(fs.readFileSync('security.js', 'utf8'), sandbox);
    vm.runInNewContext(fs.readFileSync('auth.js', 'utf8'), sandbox);
    const list = key => JSON.parse(local.getItem(key) || '[]');
    return { api: sandbox.module.exports, context: sandbox, local, list };
}
function service(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-account-switch-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = createFileStore(dir);
    return { store, service: createAccountService({ store, verifyGoogle: async token => ({ uid: 'google_' + token, email: token + '@example.invalid', provider: 'google', name: token }) }) };
}
const row = (id, createdAt, name = 'Negroni') => ({ id, drinkId: '11003', name, createdAt, taste: 'Sert', rating: 'like', note: '' });

test('Google sign-out then sign-in to the same account brings the lists back (no cloud backup)', async t => {
    const { service: svc, store } = service(t);
    const c = client(svc, { barcepte_cloud_backup_consent: 'denied' });
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '["11000"]');
    c.local.setItem('selectedIngredients', '["Gin","Lime Juice"]');
    c.local.setItem('shoppingList', '["Nane"]');
    c.local.setItem('preparationHistory', JSON.stringify([row('a', 5)]));
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), []);
    assert.deepEqual(c.list('selectedIngredients'), []);
    assert.equal(c.local.getItem('preparationHistory'), null, 'the notebook leaves with the account');
    // H2: the app is told to drop its in-memory lists right away.
    assert.deepEqual(c.context.applied.at(-1).favorites, []);
    assert.deepEqual(c.context.applied.at(-1).selected, []);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails'), ['11000']);
    assert.deepEqual(c.list('selectedIngredients'), ['Gin', 'Lime Juice']);
    assert.deepEqual(c.list('shoppingList'), ['Nane']);
    assert.deepEqual(c.list('preparationHistory').map(r => r.id), ['a']);
    assert.deepEqual(c.context.applied.at(-1).favorites, ['11000'], 'the app re-reads the restored lists');
    assert.equal(c.local.getItem('barcepte_cloud_data_google_alice'), null, 'the on-device copy is consumed');
    assert.equal(await store.getBackup('google_alice'), null, 'nothing uploaded without consent');
});

test('sign-in merges the on-device copy with the cloud backup and de-duplicates the notebook', async t => {
    const { service: svc, store } = service(t);
    // Another device created the backup.
    const other = client(svc, { barcepte_cloud_backup_consent: 'granted', favoriteCocktails: '["11007"]', shoppingList: '["limon"]',
        preparationHistory: JSON.stringify([row('a', 5), row('cloud', 9, 'Mojito')]) });
    await other.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11007']);
    // This device signed out with its own lists before syncing.
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted', barcepte_data_owner: 'google_alice',
        barcepte_cloud_data_google_alice: JSON.stringify({ updatedAt: 1, data: { favorites: ['11000'], customs: [], shopping: ['Limon', 'Nane'], selected: ['Gin'],
            history: [row('a', 5), row('local', 7)] } }) });
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails').sort(), ['11000', '11007']);
    assert.deepEqual(c.list('shoppingList'), ['limon', 'Nane'], 'shopping items are merged case-insensitively');
    assert.deepEqual(c.list('selectedIngredients'), ['Gin']);
    assert.deepEqual(c.list('preparationHistory').map(r => r.id), ['cloud', 'local', 'a']);
    // Consent was given earlier, so the merged (larger) lists are uploaded; nothing is lost in the cloud.
    const cloud = (await store.getBackup('google_alice')).data;
    assert.deepEqual(cloud.favorites.sort(), ['11000', '11007']);
    assert.equal(cloud.history.length, 3);
});

test('an empty device never silently replaces an existing cloud backup', async t => {
    const { service: svc, store } = service(t);
    const first = client(svc, { barcepte_cloud_backup_consent: 'granted', favoriteCocktails: '["11000"]' });
    await first.api.handleGoogleCredentialResponse({ credential: 'alice' });
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted' });
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '[]');
    const refused = await c.api.syncToCloud();
    assert.equal(refused.success, false);
    assert.equal(refused.emptyRefused, true);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
    // Only an explicit confirmation clears it.
    assert.equal((await c.api.syncToCloud({ allowEmpty: true })).success, true);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, []);
});

test('signing in to another Google account keeps the previous account\'s lists for it', async t => {
    const { service: svc } = service(t);
    const c = client(svc, { barcepte_cloud_backup_consent: 'denied' });
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '["11000"]');
    await c.api.handleGoogleCredentialResponse({ credential: 'bob' });
    assert.deepEqual(c.list('favoriteCocktails'), []);
    c.api.logout();
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails'), ['11000']);
});

test('mergeAccountData never drops entries and keeps the result valid', () => {
    const c = client({ handle: async () => {} });
    const recipe = (id, name) => ({ idDrink: id, strDrink: name, strInstructions: 'Karıştır.', isCustom: true, customIngredients: ['50 ml Votka'] });
    const merged = JSON.parse(JSON.stringify(c.api.mergeAccountData(
        { favorites: ['1', '2'], customs: [recipe('custom_a', 'A')], shopping: ['Nane'], selected: ['Gin'],
            history: [row('x', 3)], inventory: { items: [{ ingredient: 'Gin', quantity: 40, unit: 'cl' }], deductions: [], receipts: [] } },
        { favorites: ['2', '3'], customs: [recipe('custom_a', 'A old'), recipe('custom_b', 'B')],
            shopping: ['nane', 'Şeker'], selected: [], history: [row('x', 3), row('y', 3), row('z', 1, 'Gimlet')],
            inventory: { items: [{ ingredient: 'gin', quantity: 1, unit: 'cl' }, { ingredient: 'Rum', quantity: 70, unit: 'cl' }], deductions: [], receipts: [] } })));
    assert.deepEqual(merged.favorites, ['1', '2', '3']);
    assert.deepEqual(merged.customs.map(r => r.strDrink), ['A', 'B']);
    assert.deepEqual(merged.shopping, ['Nane', 'Şeker']);
    assert.deepEqual(merged.history.map(r => r.id), ['x', 'z'], 'same recipe at the same time is one notebook entry');
    assert.deepEqual(merged.inventory.items.map(r => [r.ingredient, r.quantity]), [['Gin', 40], ['Rum', 70]]);
    assert.doesNotThrow(() => security.backup(merged));
});
