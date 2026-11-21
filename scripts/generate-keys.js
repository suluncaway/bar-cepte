#!/usr/bin/env node
// scripts/generate-keys.js
// Shopier alıcıları için Bar Cepte Reserve aktivasyon anahtarları üretir.
// Kullanım: node scripts/generate-keys.js [plan: monthly|annual|lifetime] [adet]
// Örnekler:
//   node scripts/generate-keys.js monthly 5
//   node scripts/generate-keys.js annual 5
//   node scripts/generate-keys.js lifetime 5
//   node scripts/generate-keys.js 10 (varsayılan: lifetime)
// Without --save the output is only a preview: those keys are not in any inventory and cannot be redeemed.
// With --save, new cryptographic keys are issued into the license store at LICENSE_DATA_DIR (default: keys/).
//   LICENSE_DATA_DIR=/path node scripts/generate-keys.js monthly 5 --save

const path = require('path');
const { randomInt } = require('crypto');

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

function checksum(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0xFFFF;
    }
    return hash.toString(16).toUpperCase().padStart(4, '0');
}

function generateKey(planType = 'lifetime') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let prefix = 'LIFE';
    if (planType === 'monthly') prefix = 'MTH1';
    if (planType === 'annual') prefix = 'ANN1';

    let part2 = '';
    for (let i = 0; i < 4; i++) part2 += chars[randomInt(chars.length)];
    const check = checksum(prefix + part2);
    return `RESERVE-${prefix}-${part2}-${check}`;
}

const planLabels = {
    monthly: 'Aylık Abonelik (30 Gün)',
    annual: 'Yıllık Abonelik (365 Gün)',
    lifetime: 'Ömür Boyu VIP (Lifetime)'
};

if (require.main === module) {
    const plans = plan === 'all' ? ['monthly', 'annual', 'lifetime'] : [plan];
    if (shouldExport) {
        // A key is only redeemable once it is in the server's license inventory, so --save
        // issues fresh cryptographic keys into that store (LICENSE_DATA_DIR, default keys/).
        const { createStore } = require('./backend/store');
        const store = createStore(process.env.LICENSE_DATA_DIR || path.resolve(__dirname, '..', 'keys'));
        store.initialize();
        for (const p of plans) {
            const issued = store.issue(p, count);
            if (!isSilent) {
                console.log(`\n▶ ${planLabels[p]} (${p}):`);
                issued.forEach(k => console.log(`  ${p}: ${k}`));
            }
            console.log(`📁 Lisans envanterine kaydedildi: ${issued.length} adet ${p}`);
        }
        console.log('\n💡 Bu kodları Shopier otomatik dijital ürün teslimatına veya alıcılara gönderebilirsiniz.\n');
    } else {
        console.log('\n⚠️ ÖNİZLEME: Bu kodlar hiçbir envantere kaydedilmez ve sunucuda kullanılamaz.');
        console.log('   Satılabilir kod üretmek için --save kullanın.\n' + '='.repeat(56));
        for (const p of plans) {
            console.log(`\n▶ ${planLabels[p]} (${p}):`);
            for (let i = 1; i <= count; i++) console.log(`  ${p}: ${generateKey(p)}`);
        }
        console.log('\n' + '='.repeat(56) + '\n');
    }
}

module.exports = { generateKey, checksum };
