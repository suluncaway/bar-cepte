const test=require('node:test'),assert=require('node:assert/strict');
const {runEmailSmokeTest,getEmailSmokeStatus}=require('../scripts/email-smoke');
const now=Date.now(),env={EMAIL_SMOKE_TEST_TO:'owner@example.invalid',EMAIL_SMOKE_TEST_UNTIL:String(now+1800000),EMAIL_SMOKE_TEST_ID:'test-delivery-20261015',RESEND_API_KEY:'test-only'};
test('email smoke delivery requires a bounded explicit operator configuration',async()=>{
 const transport=async()=>{throw new Error('must not send');};
 for(const change of [{EMAIL_SMOKE_TEST_TO:''},{EMAIL_SMOKE_TEST_UNTIL:String(now-1)},{EMAIL_SMOKE_TEST_UNTIL:String(now+7200000)},{EMAIL_SMOKE_TEST_ID:''},{RESEND_API_KEY:''}])assert.equal((await runEmailSmokeTest({env:{...env,...change},now,transport})).status,'disabled');
});
test('authorized smoke test uses the configured recipient and idempotency, and reports provider delivery',async()=>{
 let calls=0;
 const transport=async(url,headers,method,body)=>{
  calls++;assert.equal(method,'POST');assert.equal(headers['Idempotency-Key'],env.EMAIL_SMOKE_TEST_ID);
  assert.equal(url,'https://api.resend.com/emails');assert.deepEqual(JSON.parse(body).to,['owner@example.invalid']);
  return {id:'test-delivery-receipt'};
 };
 const receipt=await runEmailSmokeTest({env,now,transport});assert.equal(calls,1);assert.equal(receipt.status,'accepted');
 assert.equal(await getEmailSmokeStatus(receipt.id,{env,transport:async()=>({last_event:'delivered'})}),'delivered');
});
