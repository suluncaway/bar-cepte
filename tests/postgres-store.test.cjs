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
        const response=await fetch(origin+'/api/claim-license',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,deviceId:'device-'+uid})});
        return {status:response.status,data:await response.json()};
    };
    const activated=await claim('alice');
    assert.equal(activated.status,200);
    assert.equal((await claim('bob')).status,409);
    const restored=await claim('alice');
    assert.equal(restored.data.expiresAt,activated.data.expiresAt);
    const exported=await (await fetch(origin+'/api/export-licenses',{headers:{Authorization:'Basic '+Buffer.from('admin:database-test-admin').toString('base64')}})).json();
    assert.equal(exported.claimed[key].uid,null);
    assert.equal(exported.claimed[key].deviceId,'device-alice');
    assert.equal(exported.claimed[key].expiresAt,activated.data.expiresAt);
    const {createHash,randomBytes}=require('node:crypto');
    const alice=randomBytes(32).toString('hex'),bob=randomBytes(32).toString('hex');
    for(const [token,uid] of [[alice,'google_alice'],[bob,'google_bob']])await licenseStore.putSession(createHash('sha256').update(token).digest('hex'),{user:{uid,email:uid+'@example.invalid',provider:'google'},expiresAt:Date.now()+60000});
    const bind=async(token,uid,deviceId)=>{
        const response=await fetch(origin+'/api/claim-license',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({key,uid,deviceId})});
        return {status:response.status,data:await response.json()};
    };
    assert.equal((await bind(null,'google_alice','device-alice')).status,401);
    assert.equal((await bind(alice,'forged-uid','device-alice')).status,200);
    assert.equal((await licenseStore.getClaimed())[key].uid,'google_alice');
    assert.equal((await bind(bob,'google_alice','device-alice')).status,409);
    assert.equal((await bind(null,null,'device-alice')).status,409);
    const anotherDevice=await bind(alice,null,'another-device');
    assert.equal(anotherDevice.status,200);
    assert.equal(anotherDevice.data.expiresAt,activated.data.expiresAt);
    const account=await (await fetch(origin+'/api/account',{headers:{Authorization:'Bearer '+alice}})).json();
    assert.equal(account.subscription.key,key);
});

test('PostgreSQL delivery leases, sessions, backup revisions and legacy recovery survive reconnects', {skip: !databaseUrl},async t=>{
 const first=createPostgresStore(databaseUrl),second=createPostgresStore(databaseUrl);
 t.after(async()=>{await first.close();await second.close();});
 const uid='cloud-pg-'+Date.now(),key='RESERVE-MTH1-PG01-1234';
 const sale={orderId:uid,licenseKey:key,email:'pg@example.invalid',planType:'monthly',emailSent:false};
 const records=await Promise.all([first.createSale(sale),second.createSale({...sale,licenseKey:'duplicate'})]);
 assert.equal(records[0].licenseKey,records[1].licenseKey);
 assert.equal((await Promise.all([first.acquireDelivery(uid,Date.now()),second.acquireDelivery(uid,Date.now())])).filter(Boolean).length,1);
 const user={uid:'google_'+uid,email:sale.email,provider:'google'};
 const token='test-hash-'+uid;await first.putSession(token,{user,expiresAt:Date.now()+60000});
 assert.equal((await second.getSession(token)).user.uid,user.uid);
 const data={favorites:['11000'],shopping:['Şeker 🥂'],selected:['Gin'],customs:[]};
 const writes=await Promise.all([first.saveBackup(user.uid,data,0,Date.now()),second.saveBackup(user.uid,data,0,Date.now())]);
 assert.equal(writes.filter(Boolean).length,1);
 assert.equal(await first.saveBackup(user.uid,{...data,shopping:[]},0,Date.now()),null);
 assert.deepEqual((await second.getBackup(user.uid)).data.shopping,data.shopping);
 assert.equal(await second.getBackup('unrelated-account'),null);
 await first.revokeSession(token);assert.equal(await second.getSession(token),null);
 const {Pool}=require('pg');const admin=new Pool({connectionString:databaseUrl});
 try {
  const claimedAt=Date.now()-1000,expiresAt=Date.now()+86400000;
  await admin.query('INSERT INTO barcepte_claims(license_key,payload) VALUES($1,$2)',[records[0].licenseKey,JSON.stringify({key:records[0].licenseKey,uid:null,needsReview:true,recoveryProof:{sourceCommit:'eb64139b54e24849cd283b300f785f15d8e53d45',plan:'monthly',claimedAt,expiresAt}})]);
  const recovered=await first.claim(records[0].licenseKey,{...user,deviceId:'recovered-device'});
  assert.equal(recovered.existing.uid,user.uid);assert.equal(recovered.existing.expiresAt,expiresAt);
  assert.equal((await second.getSubscription(user.uid,Date.now())).claimedAt,claimedAt);
 } finally {await admin.end();}
});

test('backup validation refuses missing claim owners and orphaned claims',()=>{
    const sold=[{orderId:'1',licenseKey:'RESERVE-MTH1-TEST-1234'}];
    assert.throws(()=>toSql({version:1,sold,claimed:{[sold[0].licenseKey]:{plan:'monthly',expiresAt:0}}}));
    assert.throws(()=>toSql({version:1,sold:[],claimed:{[sold[0].licenseKey]:{plan:'lifetime',expiresAt:0,uid:'a'}}}));
});
