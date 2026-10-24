'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {recoverLegacyClaim} = require('./legacy-recovery');
const {createBusinessStore} = require('./business-store');

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
        createSale: record => {
            const task = store.pending.then(async () => {
                const sold = await store.getSold();
                const existing = sold.find(row => row.orderId === record.orderId);
                if (existing) return existing;
                write(soldFile, [...sold, record]);
                return record;
            });
            store.pending = task.catch(() => {}); return task;
        },
        acquireDelivery: (orderId, now) => {
            const task = store.pending.then(async () => {
                const sold = await store.getSold();
                const record = sold.find(row => row.orderId === orderId);
                if (!record || record.emailSent || (record.deliveryLeaseUntil || 0) > now) return null;
                record.deliveryLeaseUntil = now + 60000;
                write(soldFile, sold); return record;
            });
            store.pending = task.catch(() => {}); return task;
        },
        claim: async (key, proposed) => {
            // File mode is intended for a single process; serialize through one promise chain.
            const task = store.pending.then(async () => {
                if (!(await store.getSold()).some(row => row.licenseKey === key)) return {issued: false};
                const claimed = await store.getClaimed();
                if (claimed[key]) {
                    let existing=claimed[key];
                    if(existing.needsReview) {
                        const sale=(await store.getSold()).find(row=>row.licenseKey===key);
                        const recovered=recoverLegacyClaim(existing,sale,proposed);
                        if(recovered) {existing=recovered;claimed[key]=recovered;write(claimedFile,claimed);}
                    }
                    if (!existing.uid && proposed.uid && existing.deviceId===proposed.deviceId && !existing.needsReview &&
                        (existing.expiresAt===0 || existing.expiresAt>Date.now())) {
                        claimed[key]={...existing,uid:proposed.uid,email:proposed.email};write(claimedFile,claimed);
                    }
                    return {issued:true,existing:claimed[key]};
                }
                write(claimedFile, {...claimed, [key]: proposed});
                return {issued: true, created: true, record: proposed};
            });
            store.pending = task.catch(() => {});
            return task;
        },
        putSession: async (token, data) => {const all=read(path.join(directory,'sessions.json'),{});all[token]=data;write(path.join(directory,'sessions.json'),all);},
        getSession: async token => read(path.join(directory,'sessions.json'),{})[token] || null,
        revokeSession: async token => {const file=path.join(directory,'sessions.json');const all=read(file,{});delete all[token];write(file,all);},
        getSubscription: async (uid,now) => Object.values(await store.getClaimed()).filter(c=>c.uid===uid && !c.needsReview &&
            (c.plan==='lifetime' && c.expiresAt===0 || c.expiresAt>now)).sort((a,b)=>(b.claimedAt||0)-(a.claimedAt||0))[0] || null,
        getBackup: async uid => read(path.join(directory,'backups.json'),{})[uid] || null,
        saveBackup: (uid,data,revision,updatedAt) => {
            const task=store.pending.then(()=>{
                const file=path.join(directory,'backups.json');const all=read(file,{});
                if((all[uid]?.revision||0)!==revision)return null;
                const backup={data,revision:revision+1,updatedAt};all[uid]=backup;write(file,all);return backup;
            });store.pending=task.catch(()=>{});return task;
        },
        exportBackup: async () => ({version: 1, sold: read(soldFile, []), claimed: read(claimedFile, {})}),
        pending: Promise.resolve()
    };
    return Object.assign(store,createBusinessStore({read,write,file:path.join(directory,'businesses.json')}));
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
                        CREATE INDEX IF NOT EXISTS barcepte_claims_uid ON barcepte_claims ((payload->>'uid'));
                        CREATE TABLE IF NOT EXISTS barcepte_sessions (
                            token_hash TEXT PRIMARY KEY, uid TEXT NOT NULL, payload JSONB NOT NULL, expires_at BIGINT NOT NULL);
                        CREATE TABLE IF NOT EXISTS barcepte_backups (
                            uid TEXT PRIMARY KEY, payload JSONB NOT NULL, revision BIGINT NOT NULL, updated_at BIGINT NOT NULL);
                        CREATE TABLE IF NOT EXISTS barcepte_businesses (
                            id TEXT PRIMARY KEY, owner_uid TEXT UNIQUE NOT NULL, payload JSONB NOT NULL);
                        CREATE TABLE IF NOT EXISTS barcepte_business_events (
                            business_id TEXT NOT NULL REFERENCES barcepte_businesses(id), event_id TEXT NOT NULL,
                            seq BIGINT NOT NULL, payload JSONB NOT NULL, PRIMARY KEY(business_id,event_id), UNIQUE(business_id,seq));
                        CREATE INDEX IF NOT EXISTS barcepte_business_events_time ON barcepte_business_events (business_id, ((payload->>'createdAt')::bigint));
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
        async createSale(record) {
            await store.ready();
            const result = await pool.query(`INSERT INTO barcepte_sales(order_id,license_key,payload) VALUES($1,$2,$3::jsonb)
                ON CONFLICT(order_id) DO NOTHING RETURNING payload`,[record.orderId,record.licenseKey,JSON.stringify(record)]);
            if (result.rows.length) return result.rows[0].payload;
            return (await pool.query('SELECT payload FROM barcepte_sales WHERE order_id=$1',[record.orderId])).rows[0].payload;
        },
        async acquireDelivery(orderId, now) {
            await store.ready();
            const result = await pool.query(`UPDATE barcepte_sales SET payload=payload || jsonb_build_object('deliveryLeaseUntil',$2::bigint+60000)
                WHERE order_id=$1 AND COALESCE((payload->>'emailSent')::boolean,false)=false
                AND COALESCE((payload->>'deliveryLeaseUntil')::bigint,0) <= $2::bigint RETURNING payload`,[orderId,now]);
            return result.rows[0]?.payload || null;
        },
        async putSession(token,data) {
            await store.ready();
            await pool.query('INSERT INTO barcepte_sessions(token_hash,uid,payload,expires_at) VALUES($1,$2,$3::jsonb,$4)',[token,data.user.uid,JSON.stringify(data),data.expiresAt]);
        },
        async getSession(token) {
            await store.ready();return (await pool.query('SELECT payload FROM barcepte_sessions WHERE token_hash=$1 AND expires_at>$2',[token,Date.now()])).rows[0]?.payload || null;
        },
        async revokeSession(token) {await store.ready();await pool.query('DELETE FROM barcepte_sessions WHERE token_hash=$1',[token]);},
        async getSubscription(uid,now) {
            await store.ready();return (await pool.query(`SELECT payload FROM barcepte_claims WHERE payload->>'uid'=$1
                AND COALESCE(payload->>'needsReview','false')<>'true'
                AND ((payload->>'plan'='lifetime' AND (payload->>'expiresAt')::bigint=0) OR (payload->>'expiresAt')::bigint>$2)
                ORDER BY (payload->>'claimedAt')::bigint DESC NULLS LAST LIMIT 1`,[uid,now])).rows[0]?.payload || null;
        },
        async getBackup(uid) {
            await store.ready();const row=(await pool.query('SELECT payload,revision,updated_at FROM barcepte_backups WHERE uid=$1',[uid])).rows[0];
            return row?{data:row.payload,revision:Number(row.revision),updatedAt:Number(row.updated_at)}:null;
        },
        async saveBackup(uid,data,revision,updatedAt) {
            await store.ready();const result=await pool.query(`INSERT INTO barcepte_backups(uid,payload,revision,updated_at)
                SELECT $1,$2::jsonb,1,$4 WHERE $3::bigint=0 OR EXISTS(SELECT 1 FROM barcepte_backups WHERE uid=$1)
                ON CONFLICT(uid) DO UPDATE SET payload=EXCLUDED.payload,revision=barcepte_backups.revision+1,updated_at=EXCLUDED.updated_at
                WHERE barcepte_backups.revision=$3::bigint RETURNING revision,updated_at`,[uid,JSON.stringify(data),revision,updatedAt]);
            return result.rows.length?{revision:Number(result.rows[0].revision),updatedAt:Number(result.rows[0].updated_at)}:null;
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
                const sold = await client.query('SELECT license_key,payload FROM barcepte_sales WHERE license_key=$1 FOR UPDATE', [key]);
                if (!sold.rowCount) {await client.query('ROLLBACK'); return {issued: false};}
                const {rows} = await client.query('SELECT payload FROM barcepte_claims WHERE license_key=$1', [key]);
                if (rows.length) {
                    let existing=rows[0].payload;
                    if(existing.needsReview) {
                        const recovered=recoverLegacyClaim(existing,sold.rows[0].payload,proposed);
                        if(recovered) {existing=recovered;await client.query('UPDATE barcepte_claims SET payload=$2::jsonb WHERE license_key=$1',[key,JSON.stringify(existing)]);}
                    }
                    if(!existing.uid && proposed.uid && existing.deviceId===proposed.deviceId && !existing.needsReview &&
                        (existing.expiresAt===0 || existing.expiresAt>Date.now())) {
                        existing={...existing,uid:proposed.uid,email:proposed.email};
                        await client.query('UPDATE barcepte_claims SET payload=$2::jsonb WHERE license_key=$1',[key,JSON.stringify(existing)]);
                    }
                    await client.query('COMMIT'); return {issued:true,existing};
                }
                await client.query('INSERT INTO barcepte_claims(license_key,payload) VALUES($1,$2::jsonb)', [key, JSON.stringify(proposed)]);
                await client.query('COMMIT');
                return {issued: true, created: true, record: proposed};
            } catch (error) {
                await client.query('ROLLBACK').catch(() => {});
                throw error;
            } finally {client.release();}
        }
    };
    return Object.assign(store,createBusinessStore({pool,ready:()=>store.ready()}));
}

function createLicenseStore(options = {}) {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL;
    if (connectionString) return createPostgresStore(connectionString);
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production');
    return createFileStore(options.directory || process.env.LICENSE_DATA_DIR || path.resolve(__dirname, '..', 'keys'));
}
module.exports = {createLicenseStore, createPostgresStore, createFileStore};
