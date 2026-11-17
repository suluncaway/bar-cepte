'use strict';
// One-off migration: classifies Reserve claim records that have no `binding` field and, on request,
// writes one. See `node scripts/migrate-claim-bindings.js --help`.
const fs = require('node:fs');
const path = require('node:path');
const {createHash, randomBytes} = require('node:crypto');
const {createLicenseStore} = require('./license-store');
const {validate} = require('./license-backup');

// ba2fe53 (2026-10-15T04:59:21+03:00): claim uids/e-mails come from a verified Google session from
// here on. Before it they were whatever the client sent, so they prove nothing.
const DEFAULT_VERIFIED_SINCE = Date.parse('2026-10-15T01:59:21Z');
const SESSION_MS = 30 * 86400000; // scripts/account-service.js
const CLASSES = ['bound', 'needs-review', 'orphan', 'device', 'unverified-uid', 'account-confirmed', 'ambiguous'];
// Classes --apply may name, and the binding each one gets.
const WRITABLE = {'device': 'device', 'unverified-uid': 'device', 'account-confirmed': 'account'};
const ACTIONS = {
    'bound': 'yok: binding zaten var',
    'needs-review': 'yok: eski kayıt, legacy-recovery akışı (alıcı e-postasıyla giriş) çözer',
    'orphan': 'yok: satış kaydı bulunamadı, elle incele',
    'device': 'binding=device yaz (davranış değişmez)',
    'unverified-uid': "binding=device yaz (uid hiçbir oturumla eşleşemez; davranış değişmez)",
    'account-confirmed': 'binding=account yaz ya da olduğu gibi bırak (bkz. --help)',
    'ambiguous': 'varsayılan dokunma; elle incele, gerekirse --ambiguous=device'
};

const HELP = `Kullanım: node scripts/migrate-claim-bindings.js [seçenekler]

binding alanı olmayan Reserve lisans kullanım (claim) kayıtlarını sınıflandırır; istenirse binding yazar.
Depo seçimi sunucuyla aynıdır: DATABASE_URL varsa PostgreSQL, yoksa dosya deposu
(--data-dir, LICENSE_DATA_DIR ya da ./keys).

Seçenekler:
  --dry-run                  Varsayılan. Hiçbir şey yazmaz, yalnızca rapor üretir.
  --json=<dosya>             Raporu JSON olarak da yaz (tam anahtar ve e-posta içermez).
  --map[=<klasör>]           Rapor sıra numarası -> tam anahtar eşleme dosyasını yaz (0600, klasör 0700;
                             değer verilmezse --backup-dir). Varsayılan: yazılmaz.
  --data-dir=<klasör>        Dosya deposu klasörü (DATABASE_URL yokken).
  --apply=<sınıf,...>        Yalnızca bu sınıflara binding yaz: device, unverified-uid, account-confirmed.
  --ambiguous=device|account 'ambiguous' kayıtlara da bu binding'i yaz (ayrıca belirtilmedikçe dokunulmaz).
                             --apply ile birlikte verilir; tek başına: --apply --ambiguous=device
  --backup-dir=<klasör>      Yazmadan önce alınan tam yedeğin klasörü (varsayılan: keys/migration-backups).
  --verified-since=<ISO>     Oturum doğrulamasının canlıya çıktığı an (varsayılan 2026-10-15T01:59:21Z).
                             Bundan önceki claim'lerde e-posta kanıt sayılmaz.
  --help                     Bu metin.

Sınıflar ve önerilen eylem:
  bound              binding zaten var. Dokunulmaz.
  needs-review       Eski içe aktarılmış kayıt. Dokunulmaz; legacy-recovery çözer.
  orphan             Satış kaydı yok. Dokunulmaz; elle incele.
  device             uid yok. binding=device (davranış değişmez).
  unverified-uid     uid "google_" ile başlamıyor (doğrulanmamış istemci uid'si); hiçbir oturumla
                     eşleşemez. binding=device (davranış değişmez).
  account-confirmed  Kanıtlı hesap bağı: kayıttaki doğrulanmış oturum e-postası satıştaki alıcı
                     e-postasıyla aynı (ya da kayıt legacy-recovery ile alıcı e-postasıyla kurtarıldı).
                     Hesap alıcının, aboneliği hesapta görünmesi doğru. binding=account yazılırsa
                     mühürleyen cihaz oturumsuzken anahtarı artık kullanamaz (alıcı giriş yapar);
                     bırakmak da güvenlidir.
  ambiguous          uid var ama kanıt yok (e-posta alıcıyla eşleşmiyor, kayıtta/satışta e-posta yok,
                     ya da claim doğrulama öncesi). İlk claim oturumlu muydu, uid sonradan mı eklendi
                     ayırt edilemez. Varsayılan dokunma. --ambiguous=device: kayıt yalnızca mühürleyen
                     cihazda çalışır, o uid'nin /api/account aboneliğinden düşer (gerçek alıcı başka bir
                     cihazında hesapla kullanıyorsa orada kaybeder; destek alıcı e-postasıyla çözer).

Rapor: anahtardan türetilmiş hiçbir değer (parça, özet) içermez; her kayıt yalnızca bu rapora özgü bir
sıra numarası (ref, #1, #2…) taşır. Eski kısa anahtarların uzayı küçük olduğundan bir özet bile tüm uzay
taranarak geri çevrilebilirdi. Bir satırı gerçek kayda eşlemek için aynı çalıştırmada --map ver: eşleme
dosyası (ref -> tam anahtar) yalnızca sahibin okuyabileceği izinlerle yazılır, raporda yalnızca yolu geçer;
işin bitince sil. Numaralar çalıştırmalar arasında değişebilir; eşlemeyi yalnızca aynı çalıştırmanın
raporuyla kullan. uid yerine sha256 özetinin ilk 12 hanesi yazılır. sessionHint yalnızca bilgi içindir
(çıkış yapılan oturumlar silindiği için kanıt değildir).

Canlıda:
  1. Sunucu çalışırken dry-run güvenlidir (salt-okuma işlem):
       DATABASE_URL=... node scripts/migrate-claim-bindings.js --json=rapor.json
  2. Raporu incele, ardından:
       DATABASE_URL=... node scripts/migrate-claim-bindings.js --apply=device,unverified-uid,account-confirmed
     İsteğe bağlı, kararı verildiyse:  ... --apply=device --ambiguous=device
  3. Yedek (tam anahtar ve e-posta içerir, 0600) --backup-dir altına yazılır; güvenli yere taşı, depoya koyma.
  Yazmalar tek işlemde ve koşulludur: kayıt sınıflandırıldığı andan beri değiştiyse ya da binding
  aldıysa atlanır; ikinci çalıştırma hiçbir şey değiştirmez. Dosya deposunda sunucuyu durdurup çalıştır.`;

class UsageError extends Error {}

function parseArgs(argv) {
    const options = {apply: null, ambiguous: null, json: null, map: null, dataDir: null, backupDir: null,
        verifiedSince: DEFAULT_VERIFIED_SINCE, help: false};
    for (const arg of argv) {
        const [name, ...rest] = arg.split('='); const value = rest.length ? rest.join('=') : null;
        if (name === '--help' || name === '-h') options.help = true;
        else if (name === '--dry-run' && value === null) options.dryRun = true;
        else if (name === '--apply') options.apply = value === null ? [] : value.split(',').map(s => s.trim()).filter(Boolean);
        else if (name === '--ambiguous' && ['device', 'account'].includes(value)) options.ambiguous = value;
        else if (name === '--json' && value) options.json = value;
        else if (name === '--map' && value !== '') options.map = value === null ? true : value;
        else if (name === '--data-dir' && value) options.dataDir = value;
        else if (name === '--backup-dir' && value) options.backupDir = value;
        else if (name === '--verified-since' && value && Number.isFinite(Date.parse(value))) options.verifiedSince = Date.parse(value);
        else throw new UsageError(`Bilinmeyen ya da hatalı seçenek: ${name}`);
    }
    if (options.apply) {
        for (const name of options.apply) {
            if (name === 'ambiguous') throw new UsageError("'ambiguous' --apply ile seçilemez; --ambiguous=device|account kullan.");
            if (!WRITABLE[name]) throw new UsageError(`--apply için geçersiz sınıf: ${name}`);
        }
        if (!options.apply.length && !options.ambiguous) throw new UsageError('--apply en az bir sınıf ister (ör. --apply=device).');
    } else if (options.ambiguous) throw new UsageError('--ambiguous yalnızca --apply ile birlikte kullanılır.');
    if (options.dryRun && options.apply) throw new UsageError('--dry-run ve --apply birlikte kullanılamaz.');
    return options;
}

const uidHash = uid => createHash('sha256').update(String(uid)).digest('hex').slice(0, 12);
const normalEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

// Classifies one claim. Only recorded facts count as evidence; anything else is 'ambiguous'.
function classify(claim, sale, verifiedSince) {
    if (claim && Object.prototype.hasOwnProperty.call(claim, 'binding')) return {class: 'bound', reason: 'binding-' + claim.binding};
    if (!claim || claim.needsReview) return {class: 'needs-review', reason: 'needs-review'};
    if (!sale) return {class: 'orphan', reason: 'sale-missing'};
    if (!claim.uid) return {class: 'device', reason: 'no-uid'};
    if (typeof claim.uid !== 'string' || !claim.uid.startsWith('google_')) return {class: 'unverified-uid', reason: 'non-google-uid'};
    // legacy-recovery only sets recoveredAt after matching the verified session e-mail to the buyer e-mail.
    if (Number.isFinite(claim.recoveredAt) && claim.recoveredAt > 0) return {class: 'account-confirmed', reason: 'legacy-recovery'};
    if (!(Number.isFinite(claim.claimedAt) && claim.claimedAt >= verifiedSince)) return {class: 'ambiguous', reason: 'claimed-before-verified-sessions'};
    const claimEmail = normalEmail(claim.email), buyerEmail = normalEmail(sale.email);
    if (!claimEmail) return {class: 'ambiguous', reason: 'claim-email-missing'};
    if (!buyerEmail) return {class: 'ambiguous', reason: 'sale-email-missing'};
    if (claimEmail === buyerEmail) return {class: 'account-confirmed', reason: 'buyer-email-match'};
    return {class: 'ambiguous', reason: 'email-mismatch'};
}

function sessionHint(claim, sessions) {
    if (!claim.uid || !Number.isFinite(claim.claimedAt)) return undefined;
    const own = sessions.filter(row => row.uid === claim.uid);
    if (own.some(row => row.expiresAt - SESSION_MS <= claim.claimedAt && claim.claimedAt <= row.expiresAt)) return 'session-at-claim';
    return own.length ? 'only-other-sessions' : 'no-stored-session';
}

function buildReport(data, options, now) {
    const sales = new Map(data.sold.map(sale => [sale.licenseKey, sale]));
    const records = [];
    for (const [key, claim] of Object.entries(data.claimed)) {
        const result = classify(claim, sales.get(key), options.verifiedSince);
        const record = {ref: records.length + 1, class: result.class, reason: result.reason};
        if (claim && claim.uid) record.uidHash = uidHash(claim.uid);
        if (claim) {
            record.plan = claim.plan;
            record.claimedAt = Number.isFinite(claim.claimedAt) ? new Date(claim.claimedAt).toISOString() : null;
            record.expired = Number.isFinite(claim.expiresAt) && claim.expiresAt > 0 && claim.expiresAt <= now;
            record.revoked = Boolean(claim.revoked || sales.get(key)?.revoked);
            record.hasDeviceId = Boolean(claim.deviceId);
            const hint = result.class === 'ambiguous' || result.class === 'account-confirmed' ? sessionHint(claim, data.sessions || []) : undefined;
            if (hint) record.sessionHint = hint;
        }
        record.action = ACTIONS[result.class];
        records.push({record, key, claim});
    }
    const counts = Object.fromEntries(CLASSES.map(name => [name, 0]));
    const reasons = {};
    for (const {record} of records) {counts[record.class]++; reasons[record.reason] = (reasons[record.reason] || 0) + 1;}
    return {records, counts, reasons};
}

function targetBinding(className, options) {
    if (!options.apply) return null;
    if (className === 'ambiguous') return options.ambiguous;
    return options.apply.includes(className) ? WRITABLE[className] : null;
}

// Creates (0700) or checks an owner-only directory for files that hold full keys.
function ensurePrivateDir(directory) {
    fs.mkdirSync(directory, {recursive: true, mode: 0o700});
    if (fs.statSync(directory).mode & 0o077) throw new Error(`Klasör başkalarınca erişilebilir, 0700 olmalı: ${directory}`);
}

// Writes a file holding full keys: owner-only file (0600) in an owner-only directory (0700).
function writePrivate(directory, prefix, value, now) {
    ensurePrivateDir(directory);
    const file = path.join(directory, `${prefix}-${new Date(now).toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.json`);
    const fd = fs.openSync(file, 'wx', 0o600);
    try {fs.writeSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
    return file;
}

function writeBackup(backup, directory, now) {
    let validation = 'ok';
    try {validate(backup);} catch (error) {validation = 'license-backup doğrulaması geçmedi (' + error.message + '); ham yedek yine yazıldı';}
    const file = writePrivate(directory, 'claim-bindings-backup', backup, now);
    const check = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Object.keys(check.claimed).length !== Object.keys(backup.claimed).length) throw new Error('Yedek doğrulanamadı');
    return {file, validation};
}

// Runs the migration against an open store. Returns the report object; `log` receives text lines.
async function run(store, options, {now = Date.now(), log = console.log} = {}) {
    // Check every output directory before anything is written, so a bad --map or --backup-dir
    // cannot leave an --apply half done (bindings written, map/report missing).
    const mapDir = options.map ? (options.map === true ? options.backupDir : options.map) : null;
    if (options.apply) ensurePrivateDir(options.backupDir);
    if (mapDir) ensurePrivateDir(mapDir);
    const data = await store.readBindingMigrationData();
    const {records, counts, reasons} = buildReport(data, options, now);
    const mode = options.apply ? 'apply' : 'dry-run';
    const report = {generatedAt: new Date(now).toISOString(), store: store.kind, mode,
        verifiedSince: new Date(options.verifiedSince).toISOString(), counts, reasons,
        records: records.map(row => row.record)};

    log(`Depo: ${store.kind} | Mod: ${mode} | Kayıt: ${records.length}`);
    for (const name of CLASSES) log(`  ${name.padEnd(18)} ${String(counts[name]).padStart(5)}   -> ${ACTIONS[name]}`);
    log('Gerekçeler: ' + Object.entries(reasons).map(([reason, n]) => `${reason}=${n}`).join(', '));
    for (const {record} of records) {
        if (record.class === 'bound') continue;
        log(`  #${record.ref} ${record.class}/${record.reason} uid#${record.uidHash || '-'} plan=${record.plan || '-'}` +
            ` claimedAt=${record.claimedAt || '-'}${record.expired ? ' expired' : ''}${record.revoked ? ' revoked' : ''}` +
            `${record.sessionHint ? ' ' + record.sessionHint : ''}`);
    }

    if (options.apply) {
        const changes = [];
        for (const {record, key, claim} of records) {
            const binding = targetBinding(record.class, options);
            if (!binding) continue;
            changes.push({key, expected: claim, patch: {binding, bindingMigratedAt: now, bindingMigrationClass: record.class}});
            record.plannedBinding = binding;
        }
        report.planned = changes.length;
        if (!changes.length) {
            log('Yazılacak kayıt yok; yedek alınmadı.');
            report.applied = 0; report.skipped = 0;
        } else {
            const backup = writeBackup(await store.exportBackup(), options.backupDir, now);
            report.backupFile = backup.file; report.backupValidation = backup.validation;
            log(`Yedek: ${backup.file} (${backup.validation})`);
            const result = await store.applyClaimBindings(changes);
            const applied = new Set(result.applied);
            for (const {record, key} of records) if (record.plannedBinding) record.result = applied.has(key) ? 'applied' : 'skipped-changed';
            report.applied = result.applied.length; report.skipped = result.skipped.length;
            log(`Yazıldı: ${result.applied.length}, atlandı (kayıt değişmiş/binding almış): ${result.skipped.length}`);
        }
    } else log('Dry-run: depoya hiçbir şey yazılmadı.');

    if (options.map) {
        report.mapFile = writePrivate(mapDir, 'claim-bindings-map', {generatedAt: report.generatedAt,
            note: 'ref -> tam lisans anahtarı; yalnızca bu çalıştırmanın raporu için. Gizli tut, işin bitince sil.',
            refs: Object.fromEntries(records.map(({record, key}) => [record.ref, key]))}, now);
        log(`Eşleme dosyası (tam anahtarlar, 0600): ${report.mapFile}`);
    } else log('Satırları gerçek kayıtlara eşlemek için --map ile yeniden çalıştır.');

    if (options.json) {
        fs.writeFileSync(options.json, JSON.stringify(report, null, 2));
        log(`JSON rapor: ${options.json}`);
    }
    return report;
}

async function main(argv = process.argv.slice(2)) {
    let options;
    try {options = parseArgs(argv);} catch (error) {
        if (!(error instanceof UsageError)) throw error;
        console.error(error.message + '\n\n' + HELP); process.exitCode = 2; return;
    }
    if (options.help) {console.log(HELP); return;}
    if (!process.env.DATABASE_URL) {
        // A mistyped data directory must not look like an empty store.
        const directory = path.resolve(options.dataDir || process.env.LICENSE_DATA_DIR || path.resolve(__dirname, '..', 'keys'));
        const missing = ['sold_licenses.json', 'claimed_licenses.json'].filter(name => !fs.existsSync(path.join(directory, name)));
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new UsageError(`Veri klasörü bulunamadı: ${directory}`);
        if (missing.length) throw new UsageError(`Veri klasöründe eksik dosya: ${missing.join(', ')} (${directory})`);
        options.dataDir = directory;
    }
    options.backupDir = path.resolve(options.backupDir || path.resolve(__dirname, '..', 'keys', 'migration-backups'));
    if (typeof options.map === 'string') options.map = path.resolve(options.map);
    const store = createLicenseStore(options.dataDir ? {directory: path.resolve(options.dataDir)} : {});
    try {await run(store, options);}
    finally {await store.close();}
}

if (require.main === module) {
    // Never print errors verbatim: they may carry the connection string.
    main().catch(error => {
        const message = String(error && error.message || 'hata').replace(/\S+:\/\/\S+/g, '<url>');
        console.error('Geçiş başarısız: ' + message); process.exitCode = 1;
    });
}
module.exports = {parseArgs, classify, buildReport, run, main, HELP, DEFAULT_VERIFIED_SINCE};
