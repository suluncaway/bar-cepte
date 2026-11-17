const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {createFileStore, createPostgresStore} = require('../scripts/license-store');
const {run, parseArgs, DEFAULT_VERIFIED_SINCE} = require('../scripts/migrate-claim-bindings');

const SCRIPT = path.resolve(__dirname, '../scripts/migrate-claim-bindings.js');
const NOW = Date.parse('2026-11-17T12:00:00Z');
const AFTER = DEFAULT_VERIFIED_SINCE + 5 * 86400000;
const BEFORE = DEFAULT_VERIFIED_SINCE - 86400000;
const DAY = 86400000;
const key = tail => `RESERVE-LIFE-MIGR-${tail}`;
const {createHash} = require('node:crypto');

// One record per class/reason. Emails are uppercase in places to check case-insensitive matching.
function fixture() {
    const sold = [], claimed = {};
    const add = (tail, saleEmail, claim) => {
        sold.push({orderId: 'order-' + tail, licenseKey: key(tail), email: saleEmail, planType: 'lifetime'});
        if (claim) claimed[key(tail)] = {key: key(tail), plan: 'lifetime', duration: 0, expiresAt: 0, ...claim};
    };
    add('DEV1', 'anon@example.com', {claimedAt: AFTER, uid: null, email: '', deviceId: 'dev-device-0001'});
    add('ACC1', 'Buyer@Example.com', {claimedAt: AFTER, uid: 'google_buyer', email: 'buyer@example.com', deviceId: 'dev-device-0002'});
    add('AMB1', 'owner@example.com', {claimedAt: AFTER, uid: 'google_friend', email: 'friend@example.com', deviceId: 'dev-device-0003'});
    add('BND1', 'x@example.com', {claimedAt: AFTER, uid: 'google_x', email: 'x@example.com', deviceId: 'dev-device-0004', binding: 'account'});
    add('REV1', 'old@example.com', {needsReview: true, uid: null});
    add('UNV1', 'demo@example.com', {claimedAt: AFTER, uid: 'demo_user_barmen', email: 'demo@example.com', deviceId: 'dev-device-0005'});
    add('PRE1', 'early@example.com', {claimedAt: BEFORE, uid: 'google_early', email: 'early@example.com', deviceId: 'dev-device-0006'});
    add('LEG1', 'legacy@example.com', {claimedAt: BEFORE, uid: 'google_legacy', email: 'legacy@example.com', deviceId: 'dev-device-0007',
        needsReview: false, recoveredAt: AFTER});
    add('DEL1', 'gone@example.com', {claimedAt: AFTER, uid: 'google_gone', email: '', deviceId: 'dev-device-0008'});
    add('NOS1', '', {claimedAt: AFTER, uid: 'google_nosale', email: 'n@example.com', deviceId: 'dev-device-0009'});
    add('FREE', 'free@example.com', null);
    const sessions = [{uid: 'google_friend', expiresAt: AFTER + 10 * DAY}, {uid: 'google_buyer', expiresAt: AFTER + 40 * DAY}];
    return {sold, claimed, sessions};
}
const EXPECTED = {DEV1: 'device', ACC1: 'account-confirmed', AMB1: 'ambiguous', BND1: 'bound', REV1: 'needs-review',
    UNV1: 'unverified-uid', PRE1: 'ambiguous', LEG1: 'account-confirmed', DEL1: 'ambiguous', NOS1: 'ambiguous'};
// Key tails too: in old short keys the last characters are the checksum.
const SECRETS = data => [...data.sold.map(s => s.licenseKey), ...data.sold.map(s => s.licenseKey.slice(-4)), ...data.sold.map(s => s.email).filter(Boolean),
    ...Object.values(data.claimed).map(c => c.email).filter(Boolean), 'google_friend', 'google_buyer', 'dev-device-0003'];

function fileStoreWith(data) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-migrate-'));
    fs.writeFileSync(path.join(dir, 'sold_licenses.json'), JSON.stringify(data.sold));
    fs.writeFileSync(path.join(dir, 'claimed_licenses.json'), JSON.stringify(data.claimed));
    fs.writeFileSync(path.join(dir, 'sessions.json'), JSON.stringify(Object.fromEntries(
        data.sessions.map((s, i) => ['token' + i, {user: {uid: s.uid, email: 'secret@example.com'}, expiresAt: s.expiresAt}]))));
    return {dir, store: createFileStore(dir)};
}
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir, {recursive: true}).sort()
    .map(name => [name, fs.statSync(path.join(dir, name)).isFile() ? fs.readFileSync(path.join(dir, name), 'utf8') : 'dir']));
const quiet = {now: NOW, log: () => {}};
const options = (argv, backupDir) => ({...parseArgs(argv), backupDir});

// The full scenario, shared by the file and PostgreSQL stores.
async function scenario(store, data, backupDir) {
    const lines = [];
    const dry = await run(store, options(['--map'], backupDir), {now: NOW, log: line => lines.push(line)});
    // Rows are matched to keys only through the private map file.
    const refs = JSON.parse(fs.readFileSync(dry.mapFile, 'utf8')).refs;
    const byTail = Object.fromEntries(dry.records.map(r => [refs[r.ref].slice(-4), r]));
    for (const [tail, cls] of Object.entries(EXPECTED)) assert.equal(byTail[tail].class, cls, tail);
    assert.deepEqual(dry.records.map(r => r.ref), dry.records.map((r, i) => i + 1));
    fs.rmSync(dry.mapFile);
    assert.equal(byTail.AMB1.reason, 'email-mismatch');
    assert.equal(byTail.PRE1.reason, 'claimed-before-verified-sessions');
    assert.equal(byTail.DEL1.reason, 'claim-email-missing');
    assert.equal(byTail.NOS1.reason, 'sale-email-missing');
    assert.equal(byTail.LEG1.reason, 'legacy-recovery');
    assert.equal(byTail.AMB1.sessionHint, 'session-at-claim');
    assert.equal(byTail.ACC1.uidHash.length, 12);
    assert.equal(dry.counts.ambiguous, 4);
    const output = lines.join('\n') + JSON.stringify(dry);
    for (const secret of SECRETS(data)) assert.equal(output.includes(secret), false, 'report leaks ' + secret);

    // Before the migration the friend's account sees the device claim it was silently attached to.
    assert.equal((await store.getSubscription('google_friend', NOW)).key, key('AMB1'));
    const before = await store.getClaimed();

    // --apply without --ambiguous leaves ambiguous records untouched.
    const first = await run(store, options(['--apply=device,unverified-uid,account-confirmed'], backupDir), quiet);
    assert.equal(first.applied, 4); assert.equal(first.skipped, 0);
    assert.ok(fs.existsSync(first.backupFile));
    assert.equal(fs.statSync(first.backupFile).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(fs.readFileSync(first.backupFile, 'utf8')).claimed, before);
    let claimed = await store.getClaimed();
    assert.equal(claimed[key('DEV1')].binding, 'device');
    assert.equal(claimed[key('UNV1')].binding, 'device');
    assert.equal(claimed[key('ACC1')].binding, 'account');
    assert.equal(claimed[key('LEG1')].binding, 'account');
    assert.equal(claimed[key('ACC1')].bindingMigrationClass, 'account-confirmed');
    for (const tail of ['AMB1', 'PRE1', 'DEL1', 'NOS1', 'REV1']) assert.deepEqual(claimed[key(tail)], before[key(tail)], tail);
    assert.deepEqual(claimed[key('BND1')], before[key('BND1')]);
    assert.equal((await store.getSubscription('google_friend', NOW)).key, key('AMB1'));
    assert.equal((await store.getSubscription('google_buyer', NOW)).key, key('ACC1'));

    // Ambiguous needs its own flag; after it the friend's account no longer gets the key.
    const second = await run(store, options(['--apply', '--ambiguous=device'], backupDir), quiet);
    assert.equal(second.applied, 4);
    claimed = await store.getClaimed();
    assert.equal(claimed[key('AMB1')].binding, 'device');
    assert.equal(claimed[key('AMB1')].uid, 'google_friend', 'only binding is written');
    assert.equal(await store.getSubscription('google_friend', NOW), null);
    assert.equal(await store.getSubscription('google_early', NOW), null);
    assert.equal((await store.getSubscription('google_buyer', NOW)).key, key('ACC1'));

    // Idempotent: a rerun with every flag changes nothing and takes no backup.
    const backups = fs.readdirSync(backupDir).length;
    const settled = await store.getClaimed();
    const third = await run(store, options(['--apply=device,unverified-uid,account-confirmed', '--ambiguous=device'], backupDir), quiet);
    assert.equal(third.planned, 0); assert.equal(third.applied, 0);
    assert.deepEqual(await store.getClaimed(), settled);
    assert.equal(fs.readdirSync(backupDir).length, backups);
    assert.equal(third.counts.bound, 9);
}

test('file store: classify, dry-run, apply, ambiguous flag and idempotency', async t => {
    const data = fixture();
    const {dir, store} = fileStoreWith(data);
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-migrate-backup-'));
    t.after(() => {fs.rmSync(dir, {recursive: true, force: true}); fs.rmSync(backupDir, {recursive: true, force: true});});
    await scenario(store, data, backupDir);
});

test('the report cannot be used to recover keys: no key substrings or hash prefixes; map file is private', async t => {
    const data = fixture();
    const legacy = 'RESERVE-Q7K2-M9X4-B3F8'; // old short format: 4 random characters, visible checksum
    data.sold.push({orderId: 'order-legacy', licenseKey: legacy, email: 'l@example.com', planType: 'lifetime'});
    data.claimed[legacy] = {key: legacy, plan: 'lifetime', expiresAt: 0, claimedAt: AFTER, uid: 'google_l', email: 'other@example.com', deviceId: 'dev-device-0010'};
    const {dir, store} = fileStoreWith(data);
    const mapDir = path.join(dir, 'private', 'maps');
    const jsonFile = path.join(dir, 'report.json');
    t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const lines = [];
    const report = await run(store, {...options(['--map=' + mapDir]), json: jsonFile}, {now: NOW, log: line => lines.push(line)});
    const texts = {json: fs.readFileSync(jsonFile, 'utf8'), console: lines.join('\n')};
    for (const k of Object.keys(data.claimed)) {
        const material = new Set([k.slice('RESERVE-'.length)]);
        for (let i = 0; i < k.length; i++) for (let j = i + 4; j <= k.length; j++) if (!'RESERVE-'.includes(k.slice(i, j))) material.add(k.slice(i, j));
        for (const algorithm of ['sha256', 'sha1', 'md5']) for (const input of [k, k.toLowerCase(), k.replace(/-/g, '')]) {
            const digest = createHash(algorithm).update(input).digest();
            material.add(digest.toString('hex').slice(0, 8)); material.add(digest.toString('hex').slice(0, 8).toUpperCase());
            material.add(digest.toString('base64').slice(0, 8)); material.add(digest.toString('base64url').slice(0, 8));
        }
        for (const [where, text] of Object.entries(texts)) for (const piece of material) assert.equal(text.includes(piece), false, `${where} contains ${piece}`);
    }
    for (const record of report.records) assert.deepEqual(Object.keys(record).filter(name => /key/i.test(name)), []);
    // Every row maps back to its key only through the map file, which only its owner can read.
    assert.equal(report.mapFile.startsWith(mapDir), true);
    assert.equal(texts.json.includes(report.mapFile), true);
    assert.equal(fs.statSync(report.mapFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(mapDir).mode & 0o777, 0o700);
    const refs = JSON.parse(fs.readFileSync(report.mapFile, 'utf8')).refs;
    assert.deepEqual(Object.values(refs).sort(), Object.keys(data.claimed).sort());
    assert.equal(report.records.find(r => refs[r.ref] === legacy).class, 'ambiguous');
    // Without --map nothing with key material is written at all.
    const plain = await run(store, options([]), quiet);
    assert.equal(plain.mapFile, undefined);
    assert.equal(fs.readdirSync(mapDir).length, 1);
    // An existing directory others can read is refused.
    const open = path.join(dir, 'open'); fs.mkdirSync(open, {mode: 0o755}); fs.chmodSync(open, 0o755);
    await assert.rejects(run(store, options(['--map=' + open]), quiet), /0700/);
});

test('file store: dry-run writes nothing; orphan claims are reported, not changed', async t => {
    const data = fixture();
    data.claimed['RESERVE-LIFE-ORPH-ZZ99'] = {key: 'RESERVE-LIFE-ORPH-ZZ99', plan: 'lifetime', expiresAt: 0, uid: 'google_o', email: 'o@example.com'};
    const {dir, store} = fileStoreWith(data);
    const backupDir = path.join(dir, 'backups');
    t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const jsonFile = path.join(os.tmpdir(), `bar-migrate-report-${process.pid}.json`);
    t.after(() => fs.rmSync(jsonFile, {force: true}));
    const before = snapshot(dir);
    const report = await run(store, {...options(['--dry-run']), json: jsonFile, backupDir}, quiet);
    assert.deepEqual(snapshot(dir), before);
    assert.equal(report.counts.orphan, 1);
    const written = fs.readFileSync(jsonFile, 'utf8');
    for (const secret of [...SECRETS(data), 'RESERVE-LIFE-ORPH-ZZ99', 'o@example.com']) assert.equal(written.includes(secret), false);
    // A claim that changed after classification is skipped, not overwritten.
    const changes = [{key: key('DEV1'), expected: {...data.claimed[key('DEV1')], uid: 'other'}, patch: {binding: 'device'}}];
    assert.deepEqual(await store.applyClaimBindings(changes), {applied: [], skipped: [key('DEV1')]});
    assert.deepEqual(snapshot(dir), before);
});

test('CLI: help, usage errors and a dry run on a data directory', async t => {
    const data = fixture();
    const {dir} = fileStoreWith(data);
    t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const env = {...process.env}; delete env.DATABASE_URL; delete env.NODE_ENV; delete env.LICENSE_DATA_DIR;
    const cli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], {env, encoding: 'utf8'});
    const help = cli('--help');
    assert.equal(help.status, 0); assert.match(help.stdout, /--ambiguous=device/); assert.match(help.stdout, /Canlıda/);
    for (const args of [['--apply=ambiguous'], ['--ambiguous=device'], ['--apply'], ['--apply=nope'], ['--dry-run', '--apply=device'], ['--ambiguous=maybe']]) {
        assert.equal(cli(...args, '--data-dir=' + dir).status, 2, args.join(' '));
    }
    // A mistyped or incomplete data directory is an error, not an empty report.
    const missingDir = cli('--data-dir=' + dir + '-typo');
    assert.notEqual(missingDir.status, 0); assert.match(missingDir.stderr, /Veri klasörü bulunamadı/);
    assert.doesNotMatch(missingDir.stdout, /Kayıt: 0/);
    const partial = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-migrate-partial-'));
    t.after(() => fs.rmSync(partial, {recursive: true, force: true}));
    fs.writeFileSync(path.join(partial, 'sold_licenses.json'), '[]');
    const noClaims = cli('--data-dir=' + partial);
    assert.notEqual(noClaims.status, 0); assert.match(noClaims.stderr, /eksik dosya: claimed_licenses\.json/);
    fs.writeFileSync(path.join(partial, 'claimed_licenses.json'), '{}');
    const empty = cli('--data-dir=' + partial);
    assert.equal(empty.status, 0, empty.stderr); assert.match(empty.stdout, /Kayıt: 0/);
    assert.match(help.stdout, /--map/); assert.doesNotMatch(help.stdout, /keyId|node -e/);
    assert.equal(cli('--map=', '--data-dir=' + dir).status, 2);
    const before = snapshot(dir);
    const dry = cli('--data-dir=' + dir);
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /ambiguous\s+4/);
    assert.match(dry.stdout, /Dry-run/);
    for (const secret of SECRETS(data)) assert.equal(dry.stdout.includes(secret), false);
    assert.deepEqual(snapshot(dir), before);
});

test('PostgreSQL store: same scenario', {skip: !process.env.TEST_DATABASE_URL}, async t => {
    const {Pool} = require('pg');
    const admin = new Pool({connectionString: process.env.TEST_DATABASE_URL});
    // Own database, so this file can run in parallel with postgres-store.test.cjs.
    const name = 'barcepte_migrate_' + process.pid;
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
    const url = new URL(process.env.TEST_DATABASE_URL); url.pathname = '/' + name;
    const store = createPostgresStore(url.toString());
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-migrate-pg-'));
    t.after(async () => {
        await store.close();
        await admin.query(`DROP DATABASE IF EXISTS ${name}`); await admin.end();
        fs.rmSync(backupDir, {recursive: true, force: true});
    });
    await store.ready();
    const data = fixture();
    const db = new Pool({connectionString: url.toString()});
    try {
        for (const sale of data.sold) await store.saveSold(sale);
        for (const [k, claim] of Object.entries(data.claimed)) await db.query('INSERT INTO barcepte_claims(license_key,payload) VALUES($1,$2::jsonb)', [k, JSON.stringify(claim)]);
        for (const [i, s] of data.sessions.entries()) await store.putSession('hash' + i, {user: {uid: s.uid}, expiresAt: s.expiresAt});
        const before = await store.getClaimed();
        const dry = await run(store, options([]), quiet);
        assert.equal(dry.counts.ambiguous, 4);
        assert.deepEqual(await store.getClaimed(), before, 'dry run writes nothing');
        await scenario(store, data, backupDir);
    } finally {await db.end();}
});
