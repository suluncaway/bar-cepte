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
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    const check = checksum(prefix + part2);
    return `RESERVE-${prefix}-${part2}-${check}`;
}

const planLabels = {
    monthly: 'Aylık Abonelik (30 Gün)',
    annual: 'Yıllık Abonelik (365 Gün)',
    lifetime: 'Ömür Boyu VIP (Lifetime)'
};

const exportedKeys = { monthly: [], annual: [], lifetime: [] };

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

if (shouldExport) {
    const outDir = path.resolve(__dirname, '..', 'keys');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    const plansToExport = plan === 'all' ? ['monthly', 'annual', 'lifetime'] : [plan];
    plansToExport.forEach(p => {
        const filePath = path.join(outDir, `${p}_keys.txt`);
        fs.writeFileSync(filePath, exportedKeys[p].join('\n') + '\n', 'utf8');
        console.log(`📁 Dosyaya kaydedildi: keys/${p}_keys.txt (${exportedKeys[p].length} adet)`);
    });
}

console.log('\n💡 Bu kodları Shopier otomatik dijital ürün teslimatına veya alıcılara gönderebilirsiniz.\n');

module.exports = { generateKey, checksum };
