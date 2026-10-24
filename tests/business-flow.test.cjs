const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../business-rules'),flow=require('../business-flow');
const owner={uid:'owner-test',name:'Owner'};
const state=()=>({id:'business-test',revision:1,members:{[owner.uid]:{role:'owner'}},invites:[],reversed:{},products:[{id:'product-test',name:'Gin',unit:'ml',stock:1400,minimum:1400,packSize:700,caseSize:12}],recipes:[{id:'recipe-test',name:'Serve',ingredients:[{productId:'product-test',quantity:30}]}]});
test('stock previews match committed movements without modifying the original business',()=>{
 for(const [kind,data] of [['sale',{recipeId:'recipe-test',count:8}],['gift',{recipeId:'recipe-test',count:2}],['purchase',{productId:'product-test',quantity:1,pack:'case'}],['purchase',{productId:'product-test',quantity:2,pack:'pack'}],['waste',{productId:'product-test',quantity:5,note:'Spill'}],['return',{productId:'product-test',quantity:700,note:'Return'}],['count',{productId:'product-test',quantity:0,note:'Closing count'}]]){
  const original=state(),before=structuredClone(original),preview=flow.preview(original,kind,data);
  const result=rules.apply(original,{id:'command-test',kind,data},owner,1000);
  assert.equal(preview.blocked,false);assert.equal(preview.lines[0].after,result.state.products[0].stock);
  assert.equal(preview.lines[0].delta,result.event.lines[0].delta);assert.deepEqual(original,before);
 }
});
test('shortages block previews and commits; invalid partial cases are rejected',()=>{
 const original=state(),data={recipeId:'recipe-test',count:100};
 assert.equal(flow.preview(original,'sale',data).blocked,true);
 assert.throws(()=>rules.apply(original,{id:'command-test',kind:'sale',data},owner,1000),/Insufficient stock/);
 assert.throws(()=>flow.preview(original,'purchase',{productId:'product-test',quantity:1.5,pack:'case'}),/whole packs/);
 assert.equal(original.products[0].stock,1400);
});
test('suggested restocking exceeds the critical threshold, including exact pack boundaries',()=>{
 for(const stock of [0,700,1400]){
  const product={stock,minimum:1400,packSize:700};const packs=flow.restockPacks(product);
  assert.equal(Number.isInteger(packs),true);assert.ok(stock+packs*700>1400);
  assert.ok(packs===1||stock+(packs-1)*700<=1400);
 }
});
