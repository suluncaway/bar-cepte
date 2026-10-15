const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createFileStore}=require('../scripts/license-store');
const {createFulfillmentService}=require('../scripts/order-fulfillment');
const {createShopierClient}=require('../scripts/shopier-client');
const {generateKey}=require('../scripts/generate-keys');
function setup(t,mail=async()=>true) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bar-orders-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createFileStore(dir);const calls=[];
 const service=createFulfillmentService({store,products:{'51736039':{plan:'monthly',currency:'TRY'}},generateKey,
  sendEmail:async(...args)=>{calls.push(args);return mail(...args);}});
 return {store,service,calls};
}
const order={id:'qa-order',paymentStatus:'paid',currency:'TRY',shippingInfo:{email:'customer@example.invalid',firstName:'Şule'},lineItems:[{productId:'51736039',quantity:1}]};
test('paid purchase issues, persists and delivers one key, then cannot be duplicated',async t=>{
 const {store,service,calls}=setup(t);
 assert.equal((await service.fulfill(order)).status,'delivered');
 assert.equal((await service.fulfill(order)).status,'already_processed');
 assert.equal(calls.length,1);
 const sold=await store.getSold();assert.equal(sold.length,1);assert.equal(sold[0].emailSent,true);
 const expiresAt=Date.now()+30*86400000;
 assert.equal((await store.claim(sold[0].licenseKey,{uid:'alice',plan:'monthly',expiresAt})).created,true);
 assert.equal((await store.claim(sold[0].licenseKey,{uid:'bob',plan:'monthly',expiresAt:Date.now()+999999})).existing.uid,'alice');
 assert.equal((await store.claim(sold[0].licenseKey,{uid:'alice'})).existing.expiresAt,expiresAt);
});
test('missing, unpaid, refunded and unrelated purchases issue no license or email',async t=>{
 const {store,service,calls}=setup(t);
 for(const change of [{paymentStatus:undefined},{paymentStatus:'unpaid'},{refunds:[{}]},{lineItems:[{productId:'unrelated'}]},{currency:'USD'},{lineItems:[{productId:'51736039',quantity:2}]}]) {
  assert.notEqual((await service.fulfill({...order,...change})).status,'delivered');
 }
 assert.equal((await store.getSold()).length,0);assert.equal(calls.length,0);
});
test('email failure retries the same durable key with the same idempotency key',async t=>{
 let attempts=0;const {store,service,calls}=setup(t,async()=>++attempts>1);
 assert.equal((await service.fulfill(order)).status,'delivery_pending');
 const first=(await store.getSold())[0].licenseKey;
 assert.equal((await service.fulfill(order)).status,'delivered');
 assert.equal(calls.length,2);assert.equal(calls[0][2],first);assert.equal(calls[1][2],first);
 assert.equal(calls[0][5].idempotencyKey,calls[1][5].idempotencyKey);
});
test('simultaneous polling and callback deliver only once',async t=>{
 const {store,service,calls}=setup(t);
 await Promise.all([service.fulfill(order),service.fulfill(order)]);
 assert.equal((await store.getSold()).length,1);assert.equal(calls.length,1);
});
test('Shopier callback lookup rejects mismatched order and exposes provider failures',async()=>{
 const client=createShopierClient({token:'test-only',transport:async()=>({id:'different',paymentStatus:'paid'})});
 await assert.rejects(client.getOrder('wanted'),/mismatch/);
 const failed=createShopierClient({token:'test-only',transport:async()=>{throw new Error('401');}});
 await assert.rejects(failed.listOrders());assert.equal(failed.state.status,'unavailable');
});
