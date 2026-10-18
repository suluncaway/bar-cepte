const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createFileStore}=require('../scripts/license-store');
const {createAccountService}=require('../scripts/account-service');
function setup(t) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bar-accounts-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const store=createFileStore(directory);let now=Date.now();
 const service=createAccountService({store,clock:()=>now,verifyGoogle:async credential=>{
  if(!['alice','bob'].includes(credential))throw new Error('invalid signature');
  return {uid:'google_'+credential,email:credential+'@example.invalid',provider:'google',name:credential};
 }});
 const request=async (method,url,body,token)=>{
  let status,result;
  const req={method,headers:token?{authorization:'Bearer '+token}:{}};
  const res={writeHead:s=>status=s,end:value=>result=JSON.parse(value)};
  await service.handle(req,res,url,async()=>body);
  return {status,data:result};
 };
 return {store,request,directory,advance:ms=>now+=ms};
}
const local={favorites:['123'],shopping:['Şeker'],selected:['Gin'],customs:[]};
test('two devices for one verified account share a durable backup; another account is isolated',async t=>{
 const {request,directory}=setup(t);
 const a=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 const b=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 const other=(await request('POST','/api/auth/google',{credential:'bob'})).data.token;
 assert.equal((await request('PUT','/api/account/backup',{data:local,revision:0},a)).status,200);
 const restored=await request('GET','/api/account/backup',null,b);
 assert.deepEqual(restored.data.backup.data,local);assert.equal(restored.data.backup.revision,1);
 assert.equal((await request('GET','/api/account/backup',null,other)).data.backup,null);
 assert.deepEqual((await createFileStore(directory).getBackup('google_alice')).data,local);
});
test('stale devices cannot overwrite newer backups, and backup data cannot grant Reserve',async t=>{
 const {request}=setup(t);const token=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 const forged={...local,reserve:{active:true,key:'FAKE',expiresAt:0}};
 assert.equal((await request('PUT','/api/account/backup',{data:forged,revision:0},token)).status,200);
 assert.equal((await request('PUT','/api/account/backup',{data:{...local,shopping:[]},revision:0},token)).status,409);
 const result=(await request('GET','/api/account/backup',null,token)).data;
 assert.equal(result.subscription,null);assert.equal(result.backup.data.reserve,undefined);
 assert.deepEqual(result.backup.data.shopping,['Şeker']);
});
test('personal backup fields round trip and survive uploads from an older client',async t=>{
 const {request}=setup(t);
 const token=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 const history=[{id:'event1',drinkId:'11003',name:'Negroni',createdAt:1,note:'Not',rating:'like',taste:'Sert'}];
 const preferences={alcohol:'all',tastes:['Ferah'],onboardingDone:true};
 const inventory={items:[{ingredient:'Gin',quantity:50,unit:'cl'}],deductions:['event1']};
 assert.equal((await request('PUT','/api/account/backup',{data:{preferences,history,inventory},revision:0},token)).status,200);
 assert.equal((await request('PUT','/api/account/backup',{data:{shopping:['Limon']},revision:1},token)).status,200);
 const result=(await request('GET','/api/account/backup',null,token)).data;
 assert.equal(result.personalDataVersion,1);
 assert.equal(result.inventoryDataVersion,1);
 assert.deepEqual(result.backup.data.inventory,inventory);
 assert.deepEqual(result.backup.data.history,history);
 assert.deepEqual(result.backup.data.preferences,preferences);
});
test('forged identities, missing sessions, malformed backups, expired sessions and signed-out sessions are denied',async t=>{
 const {request,advance}=setup(t);
 assert.equal((await request('POST','/api/auth/google',{credential:'forged'})).status,401);
 assert.equal((await request('GET','/api/account/backup')).status,401);
 const token=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 assert.equal((await request('PUT','/api/account/backup',{data:{shopping:[{}]},revision:0},token)).status,400);
 assert.equal((await request('POST','/api/auth/logout',{},token)).status,200);
 assert.equal((await request('GET','/api/account',null,token)).status,401);
 const second=(await request('POST','/api/auth/google',{credential:'alice'})).data.token;
 advance(31*86400000);
 assert.equal((await request('GET','/api/account',null,second)).status,401);
});
