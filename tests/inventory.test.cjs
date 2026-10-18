const test=require('node:test'),assert=require('node:assert/strict');
const inventory=require('../inventory'),security=require('../security');
const matches=(a,b)=>a.toLowerCase().replace('gin alias','gin')===b.toLowerCase();
const drink=(measure='3 cl')=>({strIngredient1:'Gin',strMeasure1:measure});
const stock=(quantity=50,unit='cl')=>({items:[{ingredient:'Gin',quantity,unit}],deductions:[],receipts:[]});
const assess=(d,s,size=1)=>inventory.assess(d,['Gin'],s,matches,size);
test('stock measures parse fractions, decimal commas and counts without guessing vague units',()=>{
 assert.deepEqual(inventory.measure('1 1/2 oz'),{quantity:1.5,unit:'oz'});
 assert.deepEqual(inventory.measure('0,5 cl'),{quantity:.5,unit:'cl'});
 assert.deepEqual(inventory.measure('1/2'),{quantity:.5,unit:'piece'});
 assert.deepEqual(inventory.measure('10 grams'),{quantity:10,unit:'g'});
 for(const raw of ['to taste','1 dash','1/0 oz','2-3 cl','1 cup',''])assert.equal(inventory.measure(raw),null);
 assert.deepEqual(inventory.ingredients({isCustom:true,customIngredients:['50 Gin','3 cl Gin','10 g Sugar']}),[
  {name:'Gin',measure:'50'},{name:'Gin',measure:'3 cl'},{name:'Sugar',measure:'10 g'}]);
});
test('recipe availability converts volume units and checks the selected portion count',()=>{
 const s=stock(10);
 assert.equal(assess(drink(),s,2)[0].missing,false);
 assert.equal(assess(drink(),s,4)[0].missing,true);
 assert.equal(assess(drink('30 ml'),stock(3))[0].missing,false);
 assert.equal(assess(drink('1 oz'),stock(29,'ml'))[0].missing,true);
 assert.equal(assess(drink('1 oz'),stock(30,'ml'))[0].missing,false);
});
test('zero stock is missing, unspecified stock and incompatible or vague measures stay unchecked',()=>{
 assert.equal(assess(drink(),stock(0))[0].missing,true);
 assert.equal(assess(drink(),inventory.empty())[0].unchecked,true);
 assert.equal(assess(drink(),stock(100,'g'))[0].unchecked,true);
 assert.equal(assess(drink('to taste'),stock())[0].unchecked,true);
 assert.equal(inventory.assess(drink(),[],stock(),matches)[0].missing,true);
});
test('repeated ingredient aliases aggregate demand and deduct only once per preparation',()=>{
 const d={...drink(),strIngredient2:'Gin alias',strMeasure2:'20 ml'};
 assert.equal(assess(d,stock(4))[0].missing,true);
 const s=stock(10),rows=assess(d,s);
 const result=inventory.deduct(s,rows,'event','Recipe',1);
 assert.equal(result.inventory.items[0].quantity,5);
 assert.equal(result.changed.length,1);
 assert.equal(s.items[0].quantity,10);
 assert.equal(inventory.deduct(result.inventory,rows,'event','Recipe',2).inventory,result.inventory);
 const next=inventory.deduct(result.inventory,assess(d,result.inventory),'next','Recipe',2);
 assert.equal(next.inventory.items[0].quantity,0);
});
test('insufficient recipes do not partially consume any stock; unknown measurements are not deducted',()=>{
 const s=stock(2);
 assert.equal(inventory.deduct(s,assess(drink(),s),'x','Recipe').inventory,s);
 const unknown=inventory.deduct(s,assess(drink('to taste'),s),'x','Recipe');
 assert.deepEqual(unknown.changed,[]);assert.equal(unknown.inventory,s);
 const d={...drink(),strIngredient2:'Lime',strMeasure2:'1'};
 assert.equal(inventory.deduct(stock(),assess(d,stock()),'x','Recipe').insufficient,true);
});
test('undo restores only the actual deduction, preserving later additions and compatible unit edits',()=>{
 const original=stock(10);
 const consumed=inventory.deduct(original,assess(drink(),original,2),'event','Recipe',1).inventory;
 assert.equal(consumed.items[0].quantity,4);
 const replenished={...consumed,items:[{ingredient:'Gin',quantity:140,unit:'ml'}]};
 const restored=inventory.undo(security.inventory(JSON.parse(JSON.stringify(replenished))),'event').inventory;
 assert.equal(restored.items[0].quantity,200);
 assert.equal(restored.receipts[0].undone,true);
 assert.equal(inventory.undo(restored,'event').inventory,restored);
 assert.equal(inventory.deduct(restored,assess(drink(),restored),'event','Recipe').already,true);
});
test('undo is atomic when tracking was removed, units conflict or the result exceeds limits',()=>{
 const s=stock(),deducted=inventory.deduct(s,assess(drink(),s),'event','Recipe',1).inventory;
 for(const items of [[],[{ingredient:'Gin',quantity:10,unit:'g'}],[{ingredient:'Gin',quantity:1000000,unit:'cl'}]]){
  const changed={...deducted,items},result=inventory.undo(changed,'event');
  assert.equal(result.conflict,true);assert.equal(result.inventory,changed);
 }
});
test('stock event ledger and undo receipts stay bounded and validate after repeated consumption',()=>{
 let s=stock(10000);
 for(let i=0;i<105;i++)s=inventory.deduct(s,assess(drink(),s),String(i),'Recipe',i).inventory;
 assert.equal(s.deductions.length,100);assert.equal(s.receipts.length,100);
 assert.deepEqual(security.inventory(s),s);
});
