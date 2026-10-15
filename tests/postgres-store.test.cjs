const test = require('node:test');
const assert = require('node:assert/strict');
const {createPostgresStore} = require('../scripts/license-store');
const {toSql} = require('../scripts/license-backup');
const databaseUrl = process.env.TEST_DATABASE_URL;

test('PostgreSQL persists across connections and atomically resolves concurrent claims', {skip: !databaseUrl}, async t => {
    const {Pool} = require('pg');
    const admin = new Pool({connectionString:databaseUrl});
    const first = createPostgresStore(databaseUrl);
    const second = createPostgresStore(databaseUrl);
    t.after(async () => {await first.close(); await second.close(); await admin.end();});
    await first.ready();
    await admin.query('TRUNCATE barcepte_claims, barcepte_sales');
    const key = 'RESERVE-MTH1-TEST-1234';
    await first.saveSold({orderId:'test-order', licenseKey:key, name:"O'Brien Şule 🥂", planType:'monthly'});
    const proposed = uid => ({key, uid, plan:'monthly', expiresAt:Date.now()+86400000});
    const results = await Promise.all([first.claim(key,proposed('alice')),second.claim(key,proposed('bob'))]);
    assert.equal(results.filter(row=>row.created).length,1);
    const winner = results.find(row=>row.created).record;
    assert.equal(results.find(row=>row.existing).existing.uid,winner.uid);
    assert.equal((await second.getClaimed())[key].expiresAt,winner.expiresAt);
    const reconnected = createPostgresStore(databaseUrl);
    try {assert.equal((await reconnected.getSold())[0].name,"O'Brien Şule 🥂");}
    finally {await reconnected.close();}
    await assert.rejects(first.saveSold({orderId:'test-order',licenseKey:'RESERVE-LIFE-FAKE-1234'}));
    assert.equal((await first.claim('RESERVE-LIFE-NONE-1234',proposed('eve'))).issued,false);
    const backup = {version:1,sold:await first.getSold(),claimed:await first.getClaimed()};
    await admin.query(toSql(backup));
    assert.equal((await first.getClaimed())[key].uid,winner.uid);
    await admin.query('TRUNCATE barcepte_claims, barcepte_sales');
    await admin.query(toSql(backup));
    assert.equal((await second.getClaimed())[key].expiresAt,winner.expiresAt);
    assert.equal((await second.getSold())[0].name,"O'Brien Şule 🥂");
});

test('PostgreSQL HTTP mode pauses activation until migration is confirmed', {skip: !databaseUrl}, async t => {
    process.env.DATABASE_URL=databaseUrl;
    delete process.env.LICENSE_MIGRATION_COMPLETE;
    process.env.ADMIN_TOKEN='database-test-admin';
    const {server,licenseStore}=require('../scripts/shopier-webhook');
    t.after(async()=>{await new Promise(r=>server.close(r));await licenseStore.close();delete process.env.DATABASE_URL;delete process.env.ADMIN_TOKEN;delete process.env.LICENSE_MIGRATION_COMPLETE;});
    await licenseStore.ready();
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin=`http://127.0.0.1:${server.address().port}`;
    const health=await (await fetch(origin+'/health')).json();
    assert.equal(health.storage,'postgres');
    assert.equal(health.migrationRequired,true);
    assert.equal((await fetch(origin+'/api/claim-license',{method:'POST'})).status,503);
    assert.equal((await fetch(origin+'/api/export-licenses')).status,401);
    process.env.LICENSE_MIGRATION_COMPLETE='true';
    const key=require('../scripts/generate-keys').generateKey('monthly');
    await licenseStore.saveSold({orderId:'api-'+Date.now(),licenseKey:key,planType:'monthly'});
    const claim=async uid=>{
        const response=await fetch(origin+'/api/claim-license',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,uid,deviceId:'device-'+uid})});
        return {status:response.status,data:await response.json()};
    };
    const activated=await claim('alice');
    assert.equal(activated.status,200);
    assert.equal((await claim('bob')).status,409);
    const restored=await claim('alice');
    assert.equal(restored.data.expiresAt,activated.data.expiresAt);
    const exported=await (await fetch(origin+'/api/export-licenses',{headers:{Authorization:'Basic '+Buffer.from('admin:database-test-admin').toString('base64')}})).json();
    assert.equal(exported.claimed[key].uid,'alice');
    assert.equal(exported.claimed[key].expiresAt,activated.data.expiresAt);

});

test('backup validation refuses missing claim owners and orphaned claims',()=>{
    const sold=[{orderId:'1',licenseKey:'RESERVE-MTH1-TEST-1234'}];
    assert.throws(()=>toSql({version:1,sold,claimed:{[sold[0].licenseKey]:{plan:'monthly',expiresAt:0}}}));
    assert.throws(()=>toSql({version:1,sold:[],claimed:{[sold[0].licenseKey]:{plan:'lifetime',expiresAt:0,uid:'a'}}}));
});
