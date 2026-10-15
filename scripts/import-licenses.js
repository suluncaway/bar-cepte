'use strict';
const fs = require('node:fs');
const {Pool} = require('pg');
const {toSql} = require('./license-backup');
async function main() {
    if (!process.env.DATABASE_URL || !process.argv[2]) throw new Error('DATABASE_URL ve yedek dosya yolu gerekli');
    const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const url = new URL(process.env.DATABASE_URL);
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) url.searchParams.set('sslmode','verify-full');
    const pool = new Pool({connectionString: url.toString(), max: 1, connectionTimeoutMillis: 15000});
    try {await pool.query(toSql(data)); console.log('Yedek aktarıldı. Satış ve kullanım sayılarını doğrulayın.');}
    finally {await pool.end();}
}
if (require.main === module) main().catch(() => {console.error('Aktarım başarısız; bağlantı ve yedek biçimini kontrol edin.'); process.exitCode=1;});
