'use strict';
const fs = require('node:fs');
const path = require('node:path');

function createFileStore(directory) {
    const soldFile = path.join(directory, 'sold_licenses.json');
    const claimedFile = path.join(directory, 'claimed_licenses.json');
    function read(file, fallback) {
        if (!fs.existsSync(file)) return fallback;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    function write(file, data) {
        fs.mkdirSync(directory, {recursive: true});
        fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
        fs.renameSync(file + '.tmp', file);
    }
    const store = {
        kind: 'file', ready: async () => {}, ping: async () => {}, close: async () => {},
        getSold: async () => {
            const data = read(soldFile, []);
            if (!Array.isArray(data)) throw new Error('Invalid sales data');
            return data;
        },
        getClaimed: async () => {
            const data = read(claimedFile, {});
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid claim data');
            return data;
        },
        saveSold: async record => {
            const sold = await store.getSold();
            const index = sold.findIndex(row => row.orderId === record.orderId);
            if (index >= 0) {
                if (sold[index].licenseKey !== record.licenseKey) throw new Error('Order already issued');
                sold[index] = {...sold[index], ...record};
            } else sold.push(record);
            write(soldFile, sold);
        },
        claim: async (key, proposed) => {
            // File mode is intended for a single process; serialize through one promise chain.
            const task = store.pending.then(async () => {
                if (!(await store.getSold()).some(row => row.licenseKey === key)) return {issued: false};
                const claimed = await store.getClaimed();
                if (claimed[key]) return {issued: true, existing: claimed[key]};
                write(claimedFile, {...claimed, [key]: proposed});
                return {issued: true, created: true, record: proposed};
            });
            store.pending = task.catch(() => {});
            return task;
        },
        exportBackup: async () => ({version: 1, sold: read(soldFile, []), claimed: read(claimedFile, {})}),
        pending: Promise.resolve()
    };
    return store;
}

function createPostgresStore(connectionString) {
    const {Pool} = require('pg');
    const databaseUrl = new URL(connectionString);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) databaseUrl.searchParams.set('sslmode', 'verify-full');
    connectionString = databaseUrl.toString();
    const pool = new Pool({connectionString, max: 4, connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000, statement_timeout: 15000});
    // Never log connection strings or errors that may contain credentials.
    pool.on('error', () => console.error('PostgreSQL connection error'));
    let initialization;
    const store = {
        kind: 'postgres',
        ready() {
            if (!initialization) initialization = (async () => {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query('SELECT pg_advisory_xact_lock(182732891)');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS barcepte_sales (
                            order_id TEXT PRIMARY KEY, license_key TEXT UNIQUE NOT NULL, payload JSONB NOT NULL);
                        CREATE TABLE IF NOT EXISTS barcepte_claims (
                            license_key TEXT PRIMARY KEY REFERENCES barcepte_sales(license_key), payload JSONB NOT NULL);
                    `);
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK').catch(() => {});
                    throw error;
                } finally {client.release();}
            })().catch(error => {initialization = null; throw error;});
            return initialization;
        },
        close: () => pool.end(),
        async ping() {await store.ready(); await pool.query('SELECT 1');},
        async getSold() {
            await store.ready();
            const {rows} = await pool.query('SELECT payload FROM barcepte_sales ORDER BY order_id');
            return rows.map(row => row.payload);
        },
        async getClaimed() {
            await store.ready();
            const {rows} = await pool.query('SELECT license_key, payload FROM barcepte_claims');
            return Object.fromEntries(rows.map(row => [row.license_key, row.payload]));
        },
        async saveSold(record) {
            await store.ready();
            const result = await pool.query(`INSERT INTO barcepte_sales(order_id,license_key,payload)
                VALUES($1,$2,$3::jsonb) ON CONFLICT(order_id) DO UPDATE
                SET payload=barcepte_sales.payload || EXCLUDED.payload
                WHERE barcepte_sales.license_key=EXCLUDED.license_key RETURNING order_id`,
                [String(record.orderId), record.licenseKey, JSON.stringify(record)]);
            if (!result.rowCount) throw new Error('Order already issued');
        },
        async exportBackup() {
            await store.ready();
            const client = await pool.connect();
            try {
                await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
                const sold = await client.query('SELECT payload FROM barcepte_sales ORDER BY order_id');
                const claimed = await client.query('SELECT license_key,payload FROM barcepte_claims');
                await client.query('COMMIT');
                return {version: 1, sold: sold.rows.map(row => row.payload),
                    claimed: Object.fromEntries(claimed.rows.map(row => [row.license_key,row.payload]))};
            } catch(error) {
                await client.query('ROLLBACK').catch(() => {});
                throw error;
            } finally {client.release();}
        },
        async claim(key, proposed) {
            await store.ready();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                // Lock the issued sale, so competing instances cannot claim the same key.
                const sold = await client.query('SELECT license_key FROM barcepte_sales WHERE license_key=$1 FOR UPDATE', [key]);
                if (!sold.rowCount) {await client.query('ROLLBACK'); return {issued: false};}
                const {rows} = await client.query('SELECT payload FROM barcepte_claims WHERE license_key=$1', [key]);
                if (rows.length) {await client.query('COMMIT'); return {issued: true, existing: rows[0].payload};}
                await client.query('INSERT INTO barcepte_claims(license_key,payload) VALUES($1,$2::jsonb)', [key, JSON.stringify(proposed)]);
                await client.query('COMMIT');
                return {issued: true, created: true, record: proposed};
            } catch (error) {
                await client.query('ROLLBACK').catch(() => {});
                throw error;
            } finally {client.release();}
        }
    };
    return store;
}

function createLicenseStore(options = {}) {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL;
    if (connectionString) return createPostgresStore(connectionString);
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production');
    return createFileStore(options.directory || process.env.LICENSE_DATA_DIR || path.resolve(__dirname, '..', 'keys'));
}
module.exports = {createLicenseStore, createPostgresStore, createFileStore};
