#!/usr/bin/env node
// scripts/generate-keys.js
// Shopier alıcıları için Bar Cepte Reserve aktivasyon anahtarları üretir.
// Kullanım: node scripts/generate-keys.js [plan: monthly|annual|lifetime] [adet]
// Örnekler:
//   node scripts/generate-keys.js monthly 5
//   node scripts/generate-keys.js annual 5
//   node scripts/generate-keys.js lifetime 5
//   node scripts/generate-keys.js 10 (varsayılan: lifetime)

const fs = require('fs');
const path = require('path');
const { randomBytes, randomUUID } = require('crypto');

const args = process.argv.slice(2);
let plan = 'lifetime';
let count = 5;
let shouldExport = false;
let isSilent = false;

// Parse CLI flags and positional arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    if (arg.startsWith('--plan=')) {
        plan = arg.split('=')[1];
    } else if (arg === '-p' && args[i + 1]) {
        plan = args[++i].toLowerCase();
    } else if (arg.startsWith('--count=')) {
        count = parseInt(arg.split('=')[1], 10) || 5;
    } else if (arg === '-c' && args[i + 1]) {
        count = parseInt(args[++i], 10) || 5;
    } else if (arg === '--export' || arg === '-e' || arg === '--save') {
        shouldExport = true;
    } else if (arg === '--silent' || arg === '-s') {
        isSilent = true;
        shouldExport = true;
    } else if (['monthly', 'annual', 'lifetime', 'all', 'm', 'y', 'l', 'a'].includes(arg)) {
        plan = (arg === 'm' || arg === 'monthly') ? 'monthly' :
               (arg === 'y' || arg === 'annual') ? 'annual' :
               (arg === 'a' || arg === 'all') ? 'all' : 'lifetime';
    } else if (/^\d+$/.test(arg)) {
        count = parseInt(arg, 10) || 5;
    }
}

if (plan === 'a') plan = 'all';

// Typo check only: this 16-bit checksum is public and is NOT a secret or proof of purchase.
// Only keys present in the server's sales registry can be activated.
function checksum(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0xFFFF;
    }
    return hash.toString(16).toUpperCase().padStart(4, '0');
}

// 32 unambiguous symbols (no 0/O, 1/I): every symbol carries exactly 5 bits.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RANDOM_LENGTH = 26; // 26 x 5 = 130 bits from crypto.randomBytes
const PLAN_PREFIX = { monthly: 'MTH1', annual: 'ANN1', lifetime: 'LIFE' };

function randomPart(length = RANDOM_LENGTH) {
    const bytes = randomBytes(length);
    let out = '';
    // 256 is a multiple of 32, so masking keeps the distribution uniform.
    for (let i = 0; i < length; i++) out += KEY_ALPHABET[bytes[i] & 31];
    return out;
}

function generateKey(planType = 'lifetime') {
    const prefix = PLAN_PREFIX[planType] || PLAN_PREFIX.lifetime;
    const part2 = randomPart();
    return `RESERVE-${prefix}-${part2}-${checksum(prefix + part2)}`;
}

// Accepts the current 130-bit format and the legacy 4-character format that was sold
// before; legacy keys still activate only while they are in the server registry.
function isValidKeyFormat(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return false;
    const parts = rawKey.trim().toUpperCase().split('-');
    if (parts.length !== 4 || parts[0] !== 'RESERVE' || !/^[A-Z0-9]{4}$/.test(parts[1]) || !/^[0-9A-F]{4}$/.test(parts[3])) return false;
    const legacy = /^[A-Z0-9]{4}$/.test(parts[2]);
    const current = parts[2].length === RANDOM_LENGTH && [...parts[2]].every(c => KEY_ALPHABET.includes(c));
    return (legacy || current) && checksum(parts[1] + parts[2]) === parts[3];
}

function isLegacyKey(rawKey) {
    return isValidKeyFormat(rawKey) && rawKey.trim().split('-')[2].length === 4;
}

// Registers keys in the server's sales registry (file store or PostgreSQL via DATABASE_URL),
// so manually issued keys can be activated. Returns the stored records.
async function registerKeys(store, planType, keys, now = Date.now) {
    const records = [];
    for (const licenseKey of keys) {
        const record = { orderId: 'manual-' + randomUUID(), licenseKey, planType, planTitle: planType,
            currency: 'TRY', email: '', name: '', source: 'manual', createdAt: new Date(now()).toISOString(),
            emailSent: false, emailSentCount: 0, lastEmailSentAt: null };
        records.push(await store.createSale(record));
    }
    return records;
}

const planLabels = {
    monthly: 'Aylık Abonelik (30 Gün)',
    annual: 'Yıllık Abonelik (365 Gün)',
    lifetime: 'Ömür Boyu VIP (Lifetime)'
};

const exportedKeys = { monthly: [], annual: [], lifetime: [] };

if (require.main === module) {
    if (plan === 'all') {
        if (!isSilent) console.log(`\n🍸 Bar Cepte Reserve — Her Plan İçin ${count} Adet Anahtar Üretildi:\n\n` + '='.repeat(56));
        ['monthly', 'annual', 'lifetime'].forEach(p => {
            if (!isSilent) console.log(`\n▶ ${planLabels[p]} (${p}):`);
            for (let i = 1; i <= count; i++) {
                const k = generateKey(p);
                exportedKeys[p].push(k);
                if (!isSilent) console.log(`  ${p}: ${k}`);
            }
        });
        if (!isSilent) console.log('\n' + '='.repeat(56));
    } else {
        if (!isSilent) console.log(`\n🍸 Bar Cepte Reserve — ${count} Adet [${planLabels[plan]}] Anahtarı Üretildi:\n\n` + '='.repeat(48));
        for (let i = 1; i <= count; i++) {
            const k = generateKey(plan);
            exportedKeys[plan].push(k);
            if (!isSilent) console.log(`${i.toString().padStart(2, ' ')}. ${k}`);
        }
        if (!isSilent) console.log('='.repeat(48));
    }

    const finish = async () => {
        if (!shouldExport) return;
        // Keys that are not in the sales registry can never be activated, so --save registers them.
        const { createLicenseStore } = require('./license-store');
        const store = createLicenseStore();
        const outDir = process.env.LICENSE_DATA_DIR ? path.resolve(process.env.LICENSE_DATA_DIR) : path.resolve(__dirname, '..', 'keys');
        fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
        try {
            await store.ready();
            const plansToExport = plan === 'all' ? ['monthly', 'annual', 'lifetime'] : [plan];
            for (const p of plansToExport) {
                await registerKeys(store, p, exportedKeys[p]);
                const filePath = path.join(outDir, `${p}_keys.txt`);
                fs.writeFileSync(filePath, exportedKeys[p].join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
                console.log(`📁 ${exportedKeys[p].length} anahtar sunucu siciline kaydedildi ve ${filePath} dosyasına yazıldı.`);
            }
        } finally {
            if (store.close) await store.close();
        }
    };
    finish().then(() => {
        console.log('\n💡 Bu kodları Shopier otomatik dijital ürün teslimatına veya alıcılara gönderebilirsiniz.\n');
    }).catch(() => {
        console.error('Anahtarlar sunucu siciline kaydedilemedi; hiçbir anahtarı dağıtmayın.');
        process.exitCode = 1;
    });
}

module.exports = { generateKey, checksum, isValidKeyFormat, isLegacyKey, registerKeys, KEY_ALPHABET, RANDOM_LENGTH };
