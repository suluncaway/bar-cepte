const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {createFileStore,createPostgresStore}=require('../scripts/license-store');
const {createBusinessService}=require('../scripts/business-service');
const rules=require('../business-rules');
const {createAccountService}=require('../scripts/account-service');
const owner={uid:'owner-test',name:'Owner'},staff={uid:'staff-test',name:'Staff'},other={uid:'outsider-test',name:'Other'};
async function setup(t,store){
 if(!store){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bar-business-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));store=createFileStore(directory);}
 let now=Date.now();const service=createBusinessService({store,authenticate:async req=>({owner,staff,other}[req.headers.authorization]),clock:()=>now});
 const request=async(method,url,body,as='owner')=>{let status,data;await service.handle({method,url,headers:{authorization:as}},{writeHead:s=>status=s,end:s=>data=JSON.parse(s)},new URL(url,'http://localhost').pathname,async()=>body);return {status,...data};};
 const created=await request('POST','/api/business',{name:'Test Bar'});let state=created.state;
 const command=async(kind,data,as='owner',revision=state.revision,id=randomUUID())=>{const result=await request('POST',`/api/business/${state.id}/commands`,{id,kind,data,revision},as);if(result.state)state=result.state;return result;};
 return {store,request,command,get state(){return state;},advance:ms=>now+=ms};
}
test('business stock and immutable audit cover packs, recipes, sales, gifts, waste, returns, counts and reversals',async t=>{
 const b=await setup(t);
 assert.equal((await b.command('product',{name:'Gin',unit:'ml',packSize:700,caseSize:12,minimum:1400})).success,true);
 const gin=b.state.products[0].id;
 await b.command('purchase',{productId:gin,quantity:1,pack:'case'});assert.equal(b.state.products[0].stock,8400);
 await b.command('recipe',{name:'Gin serve',ingredients:[{productId:gin,quantity:30}]});const recipeId=b.state.recipes[0].id;
 const saleId=randomUUID();await b.command('sale',{recipeId,count:8},'owner',b.state.revision,saleId);assert.equal(b.state.products[0].stock,8160);
 await b.command('gift',{recipeId,count:1});await b.command('waste',{productId:gin,quantity:10,note:'Spill'});
 await b.command('return',{productId:gin,quantity:700,note:'Supplier return'});
 const countId=randomUUID();await b.command('count',{productId:gin,quantity:7300,note:'Closing count'},'owner',b.state.revision,countId);
 const counted=(await b.request('GET',`/api/business/${b.state.id}/events`)).events[0];
 assert.deepEqual(counted.details,{expected:7420,observed:7300,difference:-120});
 await b.command('reverse',{eventId:countId,note:'Mistyped count'});assert.equal(b.state.products[0].stock,7420);
 assert.equal((await b.command('reverse',{eventId:countId,note:'Twice'})).status,409);
 const events=(await b.request('GET',`/api/business/${b.state.id}/events`)).events;
 assert.equal(events.find(row=>row.id===countId).details.observed,7300);
 assert.equal(events.every(row=>row.actor.uid==='owner-test'),true);
 const older=await b.request('GET',`/api/business/${b.state.id}/events?before=${events[0].seq}`);assert.equal(older.events[0].seq,events[0].seq-1);
});
test('owner-only actions, invitation expiry, one-use membership and revocation are server enforced',async t=>{
 const b=await setup(t),url=`/api/business/${b.state.id}`;
 await b.command('product',{name:'Gin',unit:'ml',packSize:700,caseSize:12,minimum:0});const productId=b.state.products[0].id;
 await b.command('purchase',{productId,quantity:1,pack:'pack'});
 await b.command('recipe',{name:'Serve',ingredients:[{productId,quantity:30}]});
 assert.equal((await b.request('GET',url,null,'other')).status,403);
 assert.equal((await b.request('GET','/api/business',null,'invalid')).status,401);
 assert.equal((await b.request('POST',url+'/commands',{id:randomUUID(),kind:'product',revision:1,data:{}},'other')).status,403);
 const invite=await b.command('invite',{});assert.equal(invite.invite.startsWith(b.state.id+'.'),true);
 assert.equal(JSON.stringify(invite.state).includes('hash'),false);
 const code=invite.invite.split('.')[1];const joined=await b.request('POST',url+'/join',{id:randomUUID(),code},'staff');assert.equal(joined.state.role,'staff');
 assert.equal((await b.request('POST',url+'/join',{id:randomUUID(),code},'other')).status,403);
 assert.equal((await b.command('product',{name:'Forbidden'},'staff',joined.state.revision)).status,403);
 const saleId=randomUUID();assert.equal((await b.command('sale',{recipeId:b.state.recipes[0].id,count:1},'staff',joined.state.revision,saleId)).success,true);
 assert.equal(b.state.products[0].stock,670);
 assert.equal((await b.command('reverse',{eventId:saleId,note:'Denied'},'staff')).status,403);
 await b.command('revoke',{uid:staff.uid});
 assert.equal((await b.request('GET',url,null,'staff')).status,403);
 assert.equal((await b.command('sale',{recipeId:b.state.recipes[0].id,count:1},'staff',1,saleId)).status,403);
 const expired=await b.command('invite',{});b.advance(86400001);
 assert.equal((await b.request('POST',url+'/join',{id:randomUUID(),code:expired.invite.split('.')[1]},'other')).status,403);
});
test('product and recipe edits preserve stock, old sales and their reversal amounts',async t=>{
 const b=await setup(t);await b.command('product',{name:'Gin',unit:'ml',packSize:700,caseSize:12,minimum:0});const productId=b.state.products[0].id;
 await b.command('purchase',{productId,quantity:1,pack:'pack'});await b.command('recipe',{name:'Serve',ingredients:[{productId,quantity:30}]});const recipeId=b.state.recipes[0].id;
 const saleId=randomUUID();await b.command('sale',{recipeId,count:2},'owner',b.state.revision,saleId);
 await b.command('recipe-update',{recipeId,name:'New serve',ingredients:[{productId,quantity:40}]});
 await b.command('product-update',{productId,name:'Gin renamed',unit:'ml',packSize:1000,caseSize:6,minimum:100});
 assert.equal(b.state.products[0].stock,640);
 await b.command('reverse',{eventId:saleId,note:'Not served'});assert.equal(b.state.products[0].stock,700);
 const old=(await b.store.businessEvents(b.state.id)).find(row=>row.id===saleId);assert.equal(old.lines[0].delta,-60);assert.equal(old.lines[0].name,'Gin');
});
test('duplicate submissions, stale revisions and insufficient stock leave quantities and audit atomic',async t=>{
 const b=await setup(t);await b.command('product',{name:'Gin',unit:'ml',packSize:700,caseSize:12,minimum:0});const productId=b.state.products[0].id;
 const eventId=randomUUID(),revision=b.state.revision;
 await b.command('purchase',{productId,quantity:1,pack:'pack'},'owner',revision,eventId);
 await b.command('purchase',{productId,quantity:1,pack:'pack'},'owner',revision,eventId);assert.equal(b.state.products[0].stock,700);
 const current=b.state.revision;
 assert.equal((await b.command('waste',{productId,quantity:701,note:'Too much'})).status,409);
 assert.equal((await b.command('purchase',{productId,quantity:1,pack:'pack'},'owner',revision)).status,409);
 const persisted=await b.store.getBusiness(b.state.id);assert.equal(persisted.revision,current);assert.equal(persisted.products[0].stock,700);
 assert.equal((await b.store.businessEvents(b.state.id)).filter(row=>row.id===eventId).length,1);
 assert.equal((await b.request('POST','/api/business',{name:'Second'})).status,409);
});
test('recipe shortages are atomic across several ingredients and reversed purchases cannot produce negative stock',()=>{
 const state={id:'business-id',owner:owner.uid,members:{[owner.uid]:{role:'owner'}},products:[{id:'product-one',name:'Gin',unit:'ml',stock:20},{id:'product-two',name:'Lime',unit:'ml',stock:5}],recipes:[{id:'recipe-one',name:'Drink',ingredients:[{productId:'product-one',quantity:10},{productId:'product-two',quantity:10}]}],invites:[],reversed:{},revision:1};
 assert.throws(()=>rules.apply(state,{id:randomUUID(),kind:'sale',data:{recipeId:'recipe-one',count:1}},owner,1),/Insufficient/);
 assert.equal(state.products[0].stock,20);
 assert.throws(()=>rules.apply(state,{id:randomUUID(),kind:'reverse',data:{note:'Fix'}},owner,1,{id:'old-event',kind:'purchase',lines:[{productId:'product-one',delta:700}]}),/Insufficient/);
});
test('business routes use verified account sessions, reject forged identities and stop after logout',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bar-business-auth-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const store=createFileStore(directory),accounts=createAccountService({store,verifyGoogle:async credential=>{if(!['alice','bob'].includes(credential))throw new Error('signature');return {uid:'google_'+credential,name:credential,provider:'google'};}});
 const business=createBusinessService({store,authenticate:accounts.authenticate});
 const request=async(method,url,body,token)=>{let status,data;const req={method,url,headers:token?{authorization:'Bearer '+token}:{}};const res={writeHead:s=>status=s,end:s=>data=JSON.parse(s)};
  if(!await accounts.handle(req,res,url,async()=>body))await business.handle(req,res,url,async()=>body);return {status,...data};};
 const a=(await request('POST','/api/auth/google',{credential:'alice'})).token,b=(await request('POST','/api/auth/google',{credential:'bob'})).token;
 const created=await request('POST','/api/business',{name:'Real-session test'},a),url='/api/business/'+created.state.id;
 assert.equal((await request('GET',url,null,b)).status,403);
 assert.equal((await request('GET',url,null,'forged-jwt')).status,401);
 assert.equal(await store.getBackup('google_alice'),null);
 await request('POST','/api/auth/logout',{},a);assert.equal((await request('GET',url,null,a)).status,401);
});
test('PostgreSQL business transactions serialize competing stock changes and preserve history across connections',{skip:!process.env.TEST_DATABASE_URL},async t=>{
 const first=createPostgresStore(process.env.TEST_DATABASE_URL),second=createPostgresStore(process.env.TEST_DATABASE_URL);t.after(async()=>{await first.close();await second.close();});await first.ready();
 const unique=randomUUID(),state={id:unique,owner:unique,members:{[unique]:{role:'owner'}},products:[{id:'product-one',name:'Gin',unit:'ml',stock:30}],recipes:[{id:'recipe-one',name:'Drink',ingredients:[{productId:'product-one',quantity:30}]}],invites:[],reversed:{},revision:1};
 await first.createBusiness(state,{id:randomUUID(),seq:1,kind:'created'});
 const consume=store=>store.businessTransaction(unique,async current=>rules.apply(current,{id:randomUUID(),kind:'sale',data:{recipeId:'recipe-one',count:1}},{uid:unique},Date.now()));
 const results=await Promise.allSettled([consume(first),consume(second)]);assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
 assert.equal((await second.getBusiness(unique)).products[0].stock,0);assert.equal((await second.businessEvents(unique)).length,2);
});
