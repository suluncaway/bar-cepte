/* Shared by the offline conversion tool and the Node import command. */
(function(root) {
    'use strict';
    const schema = `CREATE TABLE IF NOT EXISTS barcepte_sales (
        order_id TEXT PRIMARY KEY, license_key TEXT UNIQUE NOT NULL, payload JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS barcepte_claims (
        license_key TEXT PRIMARY KEY REFERENCES barcepte_sales(license_key), payload JSONB NOT NULL);`;
    function validate(data) {
        if (!data || data.version !== 1 || !Array.isArray(data.sold) ||
            !data.claimed || typeof data.claimed !== 'object' || Array.isArray(data.claimed)) throw new Error('Geçersiz yedek');
        const keys = new Set(), orders = new Set();
        for (const sale of data.sold) {
            if (!sale || typeof sale.orderId !== 'string' || !sale.orderId.trim() ||
                typeof sale.licenseKey !== 'string' || !/^RESERVE-[A-Z0-9-]{8,80}$/.test(sale.licenseKey) ||
                orders.has(sale.orderId) || keys.has(sale.licenseKey)) throw new Error('Geçersiz veya yinelenen satış');
            orders.add(sale.orderId); keys.add(sale.licenseKey);
        }
        for (const [key, claim] of Object.entries(data.claimed)) {
            if (!keys.has(key) || !claim || !['monthly','annual','lifetime'].includes(claim.plan) ||
                !Number.isFinite(claim.expiresAt) || claim.expiresAt < 0 ||
                (claim.plan !== 'lifetime' && !claim.needsReview && claim.expiresAt === 0)) throw new Error('Geçersiz kullanım kaydı');
            if (!claim.needsReview && !(typeof claim.uid === 'string' && claim.uid) &&
                !(typeof claim.deviceId === 'string' && claim.deviceId)) throw new Error('Kullanım sahibinin kimliği eksik');
        }
        return data;
    }
    function toSql(data) {
        validate(data);
        const literal = value => "'" + String(value).replace(/'/g,"''") + "'";
        const lines = ['BEGIN;', 'SET LOCAL standard_conforming_strings = on;', schema];
        for (const sale of data.sold) lines.push(`INSERT INTO barcepte_sales(order_id,license_key,payload) VALUES(${literal(sale.orderId)},${literal(sale.licenseKey)},${literal(JSON.stringify(sale))}::jsonb) ON CONFLICT DO NOTHING;
SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM barcepte_sales WHERE order_id=${literal(sale.orderId)} AND license_key=${literal(sale.licenseKey)}) THEN 1 ELSE 0 END;`);
        for (const [key, claim] of Object.entries(data.claimed)) lines.push(`INSERT INTO barcepte_claims(license_key,payload) VALUES(${literal(key)},${literal(JSON.stringify(claim))}::jsonb) ON CONFLICT DO NOTHING;`);
        lines.push('COMMIT;');
        return lines.join('\n');
    }
    const api = {validate, toSql};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.BarLicenseBackup = api;
})(typeof window !== 'undefined' ? window : globalThis);
