const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {createFileStore}=require('../scripts/license-store');const {createAccountService}=require('../scripts/account-service');
const security=require('../security');
function storage(initial={}) {const map=new Map(Object.entries(initial));return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function client(service,initial={}) {
 const sandbox={module:{exports:{}},console,setTimeout,clearTimeout,AbortController,URL,
  localStorage:storage(initial),sessionStorage:storage(),BarSecurity:security,alert(){},applyCloudBackup:data=>{sandbox.applied=data;},
  fetch:async(url,options={})=>{
   let status,value;const req={method:options.method||'GET',headers:Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
   await service.handle(req,{writeHead:s=>status=s,end:s=>value=JSON.parse(s)},new URL(url).pathname,async()=>options.body?JSON.parse(options.body):{});
   return {ok:status>=200&&status<300,status,json:async()=>value};
  }};
 vm.runInNewContext(fs.readFileSync('security.js','utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync('auth.js','utf8'),sandbox);
 return {api:sandbox.module.exports,context:sandbox};
}
test('real auth.js clients on separate devices restore the same account from the backend',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bar-cloud-clients-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createFileStore(dir);
 const service=createAccountService({store,verifyGoogle:async token=>({uid:'google_'+token,email:token+'@example.invalid',provider:'google',name:token})});
 const personalHistory=[{id:'one',drinkId:'11003',name:'Negroni',createdAt:1,taste:'Sert',rating:'like',note:'Daha az tatlı'}];
 const inventory={items:[{ingredient:'Gin',quantity:47,unit:'cl'}],deductions:['one'],receipts:[{id:'one',name:'Negroni',createdAt:1,undone:false,changes:[{ingredient:'Gin',quantity:3,unit:'cl'}]}]};
 const first=client(service,{favoriteCocktails:'["11000"]',shoppingList:'["Şeker"]',selectedIngredients:'["Gin"]',customRecipes:'[]',
  personalPreferences:JSON.stringify({alcohol:'all',tastes:['Ferah'],onboardingDone:true}),preparationHistory:JSON.stringify(personalHistory),barInventory:JSON.stringify(inventory)});
 await first.api.handleGoogleCredentialResponse({credential:'alice'});
 const second=client(service);
 await second.api.handleGoogleCredentialResponse({credential:'alice'});
 assert.equal(second.context.localStorage.getItem('shoppingList'),'["Şeker"]');
 assert.equal(second.context.localStorage.getItem('favoriteCocktails'),'["11000"]');
 assert.deepEqual(JSON.parse(second.context.localStorage.getItem('preparationHistory')),personalHistory);
 assert.deepEqual(JSON.parse(second.context.localStorage.getItem('barInventory')),inventory);
 assert.deepEqual(JSON.parse(second.context.localStorage.getItem('personalPreferences')).tastes,['Ferah']);
 assert.ok(second.context.applied);
 const other=client(service);await other.api.handleGoogleCredentialResponse({credential:'bob'});
 assert.equal((await store.getBackup('google_bob')).data.shopping.length,0);
 await second.api.handleGoogleCredentialResponse({credential:'bob'});
 assert.equal(second.context.localStorage.getItem('preparationHistory'),'[]');
 assert.deepEqual(JSON.parse(second.context.localStorage.getItem('barInventory')),{items:[],deductions:[],receipts:[]});
 assert.deepEqual(JSON.parse(second.context.localStorage.getItem('personalPreferences')).tastes,[]);
 await second.api.handleGoogleCredentialResponse({credential:'alice'});
 first.context.localStorage.setItem('shoppingList','["Limon"]');assert.equal((await first.api.syncToCloud()).success,true);
 second.context.localStorage.setItem('shoppingList','["Nane"]');
 assert.equal((await second.api.syncToCloud()).status,409);
 assert.equal(second.context.localStorage.getItem('shoppingList'),'["Nane"]');
 assert.equal((await second.api.syncFromCloud()).success,true);
 assert.equal(second.context.localStorage.getItem('shoppingList'),'["Limon"]');
 const saved=JSON.parse(second.context.localStorage.getItem('barcepte_pre_restore_google_alice'));
 assert.deepEqual(saved.shopping,['Nane']);
 second.context.fetch=async()=>{throw new Error('offline');};
 assert.equal((await second.api.syncToCloud()).success,false);
 assert.equal(second.context.localStorage.getItem('shoppingList'),'["Limon"]');
});

test('an older backup server cannot silently strip local personal data',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bar-cloud-old-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createFileStore(dir),service=createAccountService({store,verifyGoogle:async token=>({uid:'google_'+token,email:token+'@example.invalid',provider:'google',name:token})});
 const history=[{id:'one',drinkId:'11003',name:'Negroni',createdAt:1,taste:'Sert',rating:null,note:'Local'}];
 const c=client(service,{preparationHistory:JSON.stringify(history)}),fetch=c.context.fetch;
 c.context.fetch=async(url,options)=>{
  const response=await fetch(url,options);
  return {...response,json:async()=>{const data=await response.json();delete data.personalDataVersion;return data;}};
 };
 await c.api.handleGoogleCredentialResponse({credential:'alice'});
 assert.deepEqual(JSON.parse(c.context.localStorage.getItem('preparationHistory')),history);
 assert.equal((await c.api.syncToCloud()).success,false);
 assert.equal(await store.getBackup('google_alice'),null);
});
test('a delayed cloud response cannot restore a signed-out account or change its successor',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bar-cloud-race-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createFileStore(dir),service=createAccountService({store,verifyGoogle:async token=>({uid:'google_'+token,email:token+'@example.invalid',provider:'google'})});
 const first=client(service,{shoppingList:'["Limon"]'});await first.api.handleGoogleCredentialResponse({credential:'alice'});
 const realFetch=first.context.fetch;let release;
 first.context.fetch=async(url,options={})=>{
  const response=await realFetch(url,options);
  if(url.endsWith('/api/account/backup') && !options.method)await new Promise(resolve=>release=resolve);
  return response;
 };
 const restoring=first.api.syncFromCloud();
 while(!release)await new Promise(resolve=>setTimeout(resolve,0));
 first.api.logout();first.context.localStorage.setItem('shoppingList','["Nane"]');release();
 assert.equal((await restoring).success,false);
 assert.equal(first.api.getCurrentUser(),null);
 assert.equal(first.context.localStorage.getItem('shoppingList'),'["Nane"]');
 assert.equal(first.api.getSessionToken(),'');
});
test('a personal-data-capable server without inventory support cannot upload or replace local stock',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bar-stock-old-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createFileStore(dir),service=createAccountService({store,verifyGoogle:async token=>({uid:'google_'+token,provider:'google',name:token})});
 const stock={items:[{ingredient:'Gin',quantity:40,unit:'cl'}],deductions:[],receipts:[]};
 const c=client(service,{barInventory:JSON.stringify(stock)}),realFetch=c.context.fetch;
 c.context.fetch=async(url,options)=>{const response=await realFetch(url,options);return {...response,json:async()=>{const data=await response.json();delete data.inventoryDataVersion;return data;}};};
 await c.api.handleGoogleCredentialResponse({credential:'alice'});
 assert.deepEqual(JSON.parse(c.context.localStorage.getItem('barInventory')),stock);
 assert.equal((await c.api.syncToCloud()).success,false);
 assert.equal(await store.getBackup('google_alice'),null);
});

test('restored or deleted custom recipes survive reload despite an older IndexedDB cache',async()=>{
 const source=fs.readFileSync('game.js','utf8');
 const fn=source.slice(source.indexOf('async function fetchDataWithIndexedDB()'),source.indexOf('async function fetchAndStoreData()'));
 const old={idDrink:'custom_old',strDrink:'Old',strInstructions:'Mix',customIngredients:['Gin']};
 const restored={...old,idDrink:'custom_restored',strDrink:'Çilek 🥂'};
 for(const value of [JSON.stringify([restored]),'[]',null]) {
  const local=storage(value===null?{}:{customRecipes:value});
  const sandbox={console,localStorage:local,customRecipes:value===null?[]:JSON.parse(value),currentLang:'tr',I18N:{tr:{}},BarSecurity:security,
   document:{getElementById:()=>null},fetchAndStoreData:async()=>{},autoExtractAllIngredients(){},renderIngredients(){},filterCocktails(){},
   db:{transaction:name=>({objectStore:()=>({getAll:()=>{const req={result:[old]};queueMicrotask(()=>req.onsuccess());return req;},
    count:()=>{const req={result:0};queueMicrotask(()=>req.onsuccess());return req;}})})}};
  vm.createContext(sandbox);vm.runInContext(fn,sandbox);await sandbox.fetchDataWithIndexedDB();
  const expected=value===null?[security.recipe(old)]:JSON.parse(value);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.customRecipes)),expected);
 }
});
