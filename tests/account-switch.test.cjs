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
// `reuse` reloads the page on the same device: same localStorage and sessionStorage, fresh scripts.
function client(service, initial = {}, reuse = null) {
    const local = reuse ? reuse.local : storage(initial);
    const sandbox = { module: { exports: {} }, console, setTimeout, clearTimeout, AbortController, URL,
        localStorage: local, sessionStorage: reuse ? reuse.context.sessionStorage : storage(), BarSecurity: security, alert() {}, applied: [],
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

// --- Data added without an account joins an account only with the user's consent ---
function asking(c, answer) {
    const asked = [];
    c.api.setLocalDataPrompt((summary, data) => { asked.push({ summary, favorites: [...data.favorites] }); return answer; });
    return asked;
}
async function aliceWithBackup(svc) {
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted' });
    asking(c, true);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '["11000"]');
    assert.equal((await c.api.syncToCloud()).success, true);
    c.api.logout();
    // Signed out: something is added on this device without an account.
    c.local.setItem('favoriteCocktails', '["12345"]');
    c.local.setItem('selectedIngredients', '["Rum"]');
    return c;
}

test('"don\'t add": data added without an account stays out of the account and its backup, and returns on sign-out', async t => {
    const { service: svc, store } = service(t);
    const c = await aliceWithBackup(svc);
    const asked = asking(c, false);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.equal(asked.length, 1, 'the user is asked once');
    assert.equal(asked[0].summary, '1 favori, 1 malzeme');
    assert.deepEqual(c.list('favoriteCocktails'), ['11000'], 'only the account\'s own list is shown');
    assert.deepEqual(c.list('selectedIngredients'), []);
    assert.deepEqual(c.context.applied.at(-1).favorites, ['11000'], 'the app re-reads the account\'s lists');
    // Even an explicit sync afterwards cannot carry it to the cloud.
    assert.equal((await c.api.syncToCloud()).success, true);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
    assert.ok(c.local.getItem('barcepte_guest_data').includes('12345'), 'kept on this device, not deleted');
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), ['12345'], 'back in signed-out mode');
    assert.deepEqual(c.list('selectedIngredients'), ['Rum']);
    assert.equal(c.local.getItem('barcepte_guest_data'), null);
    assert.ok(!c.local.getItem('barcepte_cloud_data_google_alice').includes('12345'), 'not in the account\'s device copy either');
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
});

test('"add": data added without an account joins the account and, with earlier consent, its backup', async t => {
    const { service: svc, store } = service(t);
    const c = await aliceWithBackup(svc);
    const asked = asking(c, true);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.equal(asked.length, 1);
    assert.deepEqual(c.list('favoriteCocktails').sort(), ['11000', '12345']);
    assert.deepEqual(c.list('selectedIngredients'), ['Rum']);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites.sort(), ['11000', '12345']);
    assert.equal(c.local.getItem('barcepte_guest_data'), null);
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), [], 'it left with the account');
});

test('the account\'s own device copy and cloud backup come back without a question', async t => {
    const { service: svc } = service(t);
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted' });
    const asked = asking(c, false);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '["11000"]');
    await c.api.syncToCloud();
    c.local.setItem('shoppingList', '["Nane"]'); // not yet in the cloud: only in the device copy
    c.api.logout();
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails'), ['11000']);
    assert.deepEqual(c.list('shoppingList'), ['Nane']);
    // Signing in again while still signed in to the same account does not ask either.
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails'), ['11000']);
    assert.equal(asked.length, 0);
});

test('a first sign-in on a device used without an account asks before adding its data', async t => {
    const { service: svc, store } = service(t);
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted', favoriteCocktails: '["11007"]',
        personalPreferences: JSON.stringify({ alcohol: 'all', tastes: ['Ferah'], onboardingDone: true }) });
    const asked = asking(c, false);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(asked.map(a => a.favorites), [['11007']]);
    assert.deepEqual(c.list('favoriteCocktails'), []);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, []);
    assert.equal(JSON.parse(c.local.getItem('personalPreferences')).onboardingDone, true, 'onboarding is not shown again');
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), ['11007']);
    // Only onboarding preferences and no lists: nothing to ask about.
    const fresh = client(svc, { personalPreferences: JSON.stringify({ alcohol: 'all', tastes: [], onboardingDone: true }) });
    const none = asking(fresh, true);
    await fresh.api.handleGoogleCredentialResponse({ credential: 'bob' });
    assert.equal(none.length, 0);
});

test('no data leaks between two accounts or from signed-out use into either of them', async t => {
    const { service: svc, store } = service(t);
    const c = await aliceWithBackup(svc); // alice: 11000; signed out with 12345 on the device
    let asked = asking(c, false);
    await c.api.handleGoogleCredentialResponse({ credential: 'bob' });
    assert.equal(asked.length, 1);
    assert.deepEqual(c.list('favoriteCocktails'), [], 'bob sees neither alice\'s nor the signed-out lists');
    c.local.setItem('favoriteCocktails', '["22222"]');
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), ['12345'], 'only the signed-out list is back');
    asked = asking(c, false);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails'), ['11000']);
    // Switching account without signing out keeps each account's lists for it.
    asked = asking(c, true);
    await c.api.handleGoogleCredentialResponse({ credential: 'bob' });
    assert.equal(asked.length, 0, 'alice\'s lists are hers, not data without an account');
    assert.deepEqual(c.list('favoriteCocktails'), ['22222']);
    c.api.logout();
    assert.deepEqual(c.list('favoriteCocktails'), ['12345']);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.deepEqual(c.list('favoriteCocktails').sort(), ['11000', '12345'], 'alice added the signed-out list herself');
    assert.equal(asked.length, 1);
    assert.ok(!c.local.getItem('barcepte_cloud_data_google_bob').includes('11000'));
    assert.ok(!c.local.getItem('barcepte_cloud_data_google_bob').includes('12345'));
    assert.ok(!(await store.getBackup('google_alice')).data.favorites.includes('22222'));
    const bobCloud = (await store.getBackup('google_bob')).data.favorites;
    assert.ok(!bobCloud.includes('11000') && !bobCloud.includes('12345'));
});

test('a reload while the question is open does not make the data the account\'s; the question comes back', async t => {
    const { service: svc, store } = service(t);
    const c = await aliceWithBackup(svc); // alice: 11000 in the cloud; 12345 added without an account
    let asked = 0;
    c.api.setLocalDataPrompt(() => { asked++; return new Promise(() => {}); }); // never answered
    c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    while (!asked) await new Promise(resolve => setImmediate(resolve));
    assert.equal(c.local.getItem('barcepte_data_owner'), 'pending:google_alice');
    // Reload: alice looks signed in, the lists on screen are still the ones without an account.
    c.context.sessionStorage.setItem('barcepte_cloud_revision', '1');
    const reloaded = client(svc, {}, c);
    assert.equal(reloaded.api.getCurrentUser().uid, 'google_alice');
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['12345']);
    // "Sync now" and "restore" refuse while the question is open; nothing reaches alice's backup.
    const sync = await reloaded.api.syncToCloud();
    assert.equal(sync.success, false);
    assert.equal(sync.pendingLocalData, true);
    assert.equal((await reloaded.api.syncFromCloud()).pendingLocalData, true);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['12345']);
    // The page asks again after the reload; "don't add" then finishes the sign-in.
    const again = asking(reloaded, false);
    assert.equal(await reloaded.api.resumePendingSignIn(), true);
    assert.equal(again.length, 1);
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['11000']);
    assert.equal(reloaded.local.getItem('barcepte_data_owner'), 'google_alice');
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
    reloaded.api.logout();
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['12345']);
    assert.ok(!reloaded.local.getItem('barcepte_cloud_data_google_alice').includes('12345'));
});

test('signing out after a reload with the question unanswered keeps the data out of the account', async t => {
    const { service: svc, store } = service(t);
    const c = await aliceWithBackup(svc);
    let asked = 0;
    c.api.setLocalDataPrompt(() => { asked++; return new Promise(() => {}); });
    c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    while (!asked) await new Promise(resolve => setImmediate(resolve));
    const reloaded = client(svc, {}, c);
    reloaded.api.logout();
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['12345'], 'back as data without an account');
    assert.equal(reloaded.local.getItem('barcepte_data_owner'), null);
    assert.ok(!reloaded.local.getItem('barcepte_cloud_data_google_alice').includes('12345'), 'not in alice\'s device copy');
    // The next sign-in to alice asks again instead of merging it silently.
    const next = asking(reloaded, false);
    await reloaded.api.handleGoogleCredentialResponse({ credential: 'alice' });
    assert.equal(next.length, 1);
    assert.deepEqual(reloaded.list('favoriteCocktails'), ['11000']);
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
});

test('signing out of a Google account without an owner mark sets the lists aside as data without an account', async t => {
    const { service: svc, store } = service(t);
    const c = client(svc, { barcepte_cloud_backup_consent: 'granted' });
    asking(c, true);
    await c.api.handleGoogleCredentialResponse({ credential: 'alice' });
    c.local.setItem('favoriteCocktails', '["11000"]');
    assert.equal((await c.api.syncToCloud()).success, true);
    // A signed-in state whose lists carry no owner mark (as after an interrupted older sign-in).
    c.local.removeItem('barcepte_data_owner');
    c.local.setItem('favoriteCocktails', '["99902"]');
    const sync = await c.api.syncToCloud();
    assert.equal(sync.success, false, '"sync now" refuses unmarked lists');
    assert.deepEqual((await store.getBackup('google_alice')).data.favorites, ['11000']);
    let movedToGuest = null;
    const realSet = c.local.setItem;
    c.local.setItem = (k, v) => { if (k === 'barcepte_guest_data') movedToGuest = JSON.parse(v).data.favorites; realSet(k, v); };
    c.api.logout();
    assert.deepEqual(movedToGuest, ['99902'], 'set aside as data without an account');
    assert.deepEqual(c.list('favoriteCocktails'), ['99902'], 'and back on the signed-out device');
    assert.equal(c.local.getItem('barcepte_cloud_data_google_alice'), null, 'nothing went into alice\'s device copy');
});

test('the question cannot be answered by page scripts: the test hook is not on BarAuth', () => {
    const c = client({ handle: async () => {} });
    assert.equal(c.context.BarAuth.setLocalDataPrompt, undefined);
    assert.equal(c.context.BarAuth.resumePendingSignIn, undefined);
    assert.equal(typeof c.api.setLocalDataPrompt, 'function', 'only the CommonJS test export has it');
});
