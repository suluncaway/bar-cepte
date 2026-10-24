const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const reports=require('../business-reports');
const {createFileStore,createPostgresStore}=require('../scripts/license-store');
const {createBusinessService}=require('../scripts/business-service');
const time=value=>Date.parse(value);
const line=(delta,extra={})=>({productId:'product-one',name:'Gin',unit:'ml',delta,...extra});
const sale=(id,at,count=1,delta=-30)=>({id,kind:'sale',label:'Negroni',createdAt:time(at),details:{recipeId:'recipe-one',count},lines:[line(delta)]});
test('report dates include the full Istanbul day and reject invalid, reversed or oversized ranges',()=>{
 const dates=reports.range('2026-10-21','2026-10-21');
 assert.equal(dates.start,time('2026-10-20T21:00:00Z'));assert.equal(dates.end,time('2026-10-21T21:00:00Z'));
 assert.equal(reports.day(time('2026-10-20T20:59:59Z')),'2026-10-20');assert.equal(reports.day(dates.start),'2026-10-21');
 assert.equal(reports.range('2024-01-01','2024-12-31').end-reports.range('2024-01-01','2024-12-31').start,366*86400000);
 for(const pair of [['2026-02-29','2026-03-01'],['2026-02-31','2026-03-01'],['2015-01-01','2015-01-01'],['2026-10-21','2026-10-20'],['2024-01-01','2025-01-01'],[null,'2026-10-21']])assert.throws(()=>reports.range(...pair));
});
function fixture(){
 const previous=sale('old-sale','2026-10-20T20:59:59Z');
 const at=time('2026-10-21T09:00:00Z');
 const events=[{id:'reverse-old',kind:'reverse',createdAt:time('2026-10-20T21:00:00Z'),lines:[line(30)],details:{reverses:previous.id}},
  {id:'received',kind:'purchase',createdAt:at,lines:[line(700)]},sale('new-sale','2026-10-21T09:00:00Z',2,-60),
  {...sale('gift','2026-10-21T10:00:00Z',1,-30),kind:'gift'},
  {id:'waste',kind:'waste',createdAt:at,lines:[line(-10)]},
  {id:'count',kind:'count',createdAt:at,lines:[line(-5)],details:{expected:530,observed:525}},
  {id:'return',kind:'return',createdAt:at,lines:[line(-100)]}];
 return {previous,events,rows:events.map(event=>({event,original:event.kind==='reverse'?previous:undefined}))};
}
test('period reports use original recorded quantities and separate reversals, complimentary, waste and count differences',()=>{
 const result=reports.summarize(fixture().rows,reports.range('2026-10-21','2026-10-22'));
 assert.equal(result.totals.grossSales,2);assert.equal(result.totals.salesReversals,1);assert.equal(result.totals.netSales,1);assert.equal(result.totals.netGifts,1);assert.equal(result.totals.reversals,1);
 assert.equal(result.recipes[0].netSales,1);assert.equal(result.recipes[0].netGifts,1);
 assert.deepEqual(result.products[0],{productId:'product-one',name:'Gin',unit:'ml',sales:30,gifts:30,waste:10,consumption:70,received:700,supplierReturns:100,countAdjustment:-5,netMovement:525});
 assert.equal(result.daily.length,2);assert.equal(result.daily[1].movements,0);
});
test('reversing an earlier sale is a negative movement today, without rewriting the earlier daily report',()=>{
 const {rows,previous}=fixture();
 const today=reports.summarize([rows[0]],reports.range('2026-10-21','2026-10-21'));
 assert.equal(today.totals.netSales,-1);assert.equal(today.products[0].consumption,-30);
 const earlier=reports.summarize([{event:previous},...rows],reports.range('2026-10-20','2026-10-20'));
 assert.equal(earlier.totals.netSales,1);assert.equal(earlier.products[0].consumption,30);
});
test('same-period reversals cancel totals exactly; grams and pieces remain separate from volume',()=>{
 const original=sale('one','2026-10-21T09:00:00Z',1,-0.1);
 const reversed={id:'undo',kind:'reverse',createdAt:original.createdAt,lines:[line(.1)]};
 const result=reports.summarize([{event:original},{event:reversed,original},{event:{kind:'waste',createdAt:original.createdAt,lines:[line(-2,{productId:'sugar',name:'Sugar',unit:'g'}),line(-1,{productId:'lime',name:'Lime',unit:'piece'})]}}],reports.range('2026-10-21','2026-10-21'));
 assert.equal(result.totals.netSales,0);assert.equal(result.products.find(row=>row.productId==='product-one').consumption,0);
 assert.equal(result.products.find(row=>row.productId==='sugar').consumption,2);assert.equal(result.products.find(row=>row.productId==='lime').unit,'piece');
 assert.throws(()=>reports.summarize([{event:reversed}],reports.range('2026-10-21','2026-10-21')));
});
test('CSV keeps numeric negatives while escaping formulas and quoted or multiline product names',()=>{
 const csv=reports.csv([['Name','Value'],['=HYPERLINK("bad")',-3],['  +SUM(1)',0],['Gin; "house"\nnew',.5],['\tformula',1]]);
 assert.ok(csv.startsWith('\ufeff"Name";"Value"\r\n'));assert.ok(csv.includes('"\'=HYPERLINK(""bad"")";"-3"'));
 assert.ok(csv.includes('"\'  +SUM(1)"'));assert.ok(csv.includes('"Gin; ""house""\nnew"'));assert.ok(csv.includes('"\'\tformula"'));
 assert.equal(reports.csv([[.125,-3.5]],','),'\ufeff"0,125";"-3,5"');
});
async function storeFixture(t,store){
 if(!store){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bar-reports-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));store=createFileStore(directory);}
 const id=randomUUID(),uid=randomUUID(),state={id,name:'Report test',owner:uid,members:{[uid]:{role:'owner',name:'Owner'}},revision:1,products:[],recipes:[],reversed:{},invites:[]};
 await store.createBusiness(state,{id:randomUUID(),seq:1,kind:'created',createdAt:time('2026-10-20T08:00:00Z')});
 const add=event=>store.businessTransaction(id,async state=>{state.revision++;return {state,event:{...event,seq:state.revision}};});
 const {previous,events}=fixture();await add(previous);for(const event of events)await add(event);
 return {store,id,uid,add};
}
test('file report query joins older originals, includes all pages and respects the snapshot revision',async t=>{
 const {store,id,add}=await storeFixture(t),dates=reports.range('2026-10-21','2026-10-21');
 for(let i=0;i<110;i++)await add(sale('extra-'+i,'2026-10-21T11:00:00Z'));
 const revision=(await store.getBusiness(id)).revision;await add(sale('after-snapshot','2026-10-21T11:00:00Z',20,-600));
 const rows=await store.businessReportRows(id,dates,revision);assert.equal(rows.length,117);assert.equal(rows[0].original.id,'old-sale');
 assert.equal(reports.summarize(rows,dates).totals.grossSales,112);assert.equal((await store.businessEvents(id)).length,100);
});
test('report endpoint isolates business accounts and validates dates before querying',async t=>{
 const {store,id,uid}=await storeFixture(t),service=createBusinessService({store,authenticate:async req=>req.headers.authorization?{uid:req.headers.authorization}:null});
 const request=async(query,as=uid)=>{let status,data;await service.handle({method:'GET',url:`/api/business/${id}/report${query}`,headers:{authorization:as}},{writeHead:s=>status=s,end:s=>data=JSON.parse(s)},`/api/business/${id}/report`,async()=>{});return {status,...data};};
 assert.equal((await request('?from=2026-10-21&to=2026-10-21','someone-else')).status,403);
 assert.equal((await request('?from=2026-10-21&to=2026-10-21','')).status,401);
 assert.equal((await request('?from=2026-02-31&to=2026-03-01')).status,400);
 const result=await request('?from=2026-10-21&to=2026-10-21');assert.equal(result.status,200);assert.equal(result.report.products[0].netMovement,525);assert.equal(result.report.timeZone,'Europe/Istanbul');
});
test('PostgreSQL reports match file reports and find reversals outside the requested dates',{skip:!process.env.TEST_DATABASE_URL},async t=>{
 const store=createPostgresStore(process.env.TEST_DATABASE_URL);t.after(()=>store.close());await store.ready();
 const {id}=await storeFixture(t,store),dates=reports.range('2026-10-21','2026-10-21'),revision=(await store.getBusiness(id)).revision;
 const result=reports.summarize(await store.businessReportRows(id,dates,revision),dates);
 assert.equal(result.totals.netSales,1);assert.equal(result.products[0].netMovement,525);assert.equal(result.products[0].consumption,70);
});
