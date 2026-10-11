#!/usr/bin/env node
// scripts/generate-keys.js
// Shopier alıcıları için Bar Cepte Reserve aktivasyon anahtarları üretir.
// Kullanım: node scripts/generate-keys.js [adet]
// Örnek: node scripts/generate-keys.js 10

const count = parseInt(process.argv[2], 10) || 5;

function checksum(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0xFFFF;
    }
    return hash.toString(16).toUpperCase().padStart(4, '0');
}

function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    const check = checksum(part1 + part2);
    return `RESERVE-${part1}-${part2}-${check}`;
}

console.log(`\n🍸 Bar Cepte Reserve — ${count} Adet Aktivasyon Anahtarı Üretildi:\n`);
console.log('=' .repeat(45));
for (let i = 1; i <= count; i++) {
    console.log(`${i.toString().padStart(2, ' ')}. ${generateKey()}`);
}
console.log('=' .repeat(45));
console.log('\n💡 Bu kodları Shopier otomatik dijital ürün teslimatına veya alıcılara gönderebilirsiniz.\n');
