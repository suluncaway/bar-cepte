const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createFileStore}=require('../scripts/license-store');
const now=Date.now(),key='RESERVE-MTH1-TEST-1234';
const sale={orderId:'legacy',licenseKey:key,email:'Owner@example.invalid',planType:'monthly'};
const original={key,needsReview:true,uid:null,expiresAt:0,recoveryProof:{sourceCommit:'eb64139b54e24849cd283b300f785f15d8e53d45',plan:'monthly',claimedAt:now-86400000,expiresAt:now+29*86400000}};
test('legacy recovery requires the verified purchase email and preserves the original expiry',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bar-recover-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const store=createFileStore(directory);await store.saveSold(sale);
 const reset=value=>fs.writeFileSync(path.join(directory,'claimed_licenses.json'),JSON.stringify({[key]:value}));
 reset(original);
 const owner={uid:'google_owner',email:'owner@example.invalid',deviceId:'new-device',expiresAt:now+365*86400000};
 for(const user of [{...owner,uid:null},{...owner,email:'other@example.invalid'}])assert.equal((await store.claim(key,user)).existing.needsReview,true);
 const recovered=(await store.claim(key,owner)).existing;
 assert.equal(recovered.uid,owner.uid);assert.equal(recovered.expiresAt,original.recoveryProof.expiresAt);
 assert.equal(recovered.claimedAt,original.recoveryProof.claimedAt);assert.equal(recovered.needsReview,false);
 assert.equal((await store.claim(key,{...owner,uid:'google_other'})).existing.uid,owner.uid);
 for(const value of [{...original,recoveryProof:null},{...original,recoveryProof:{...original.recoveryProof,expiresAt:now-1}},
  {...original,recoveryProof:{...original.recoveryProof,sourceCommit:'untrusted'}},{...original,recoveryProof:{...original.recoveryProof,plan:'lifetime',expiresAt:0}}]) {
  reset(value);assert.equal((await store.claim(key,owner)).existing.needsReview,true);
 }
});
