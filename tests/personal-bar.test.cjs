const test=require('node:test'),assert=require('node:assert/strict');
const personal=require('../personal-bar');
const prefs=()=>({...personal.defaults(),tastes:['Ferah']});
const drink=(id,extra={})=>({idDrink:id,strAlcoholic:'Alcoholic',taste:'Ferah',req:['Gin'],...extra});
const options={requirements:d=>d.req,missing:d=>d.missing||[],taste:d=>d.taste};
const event=(id,drinkId,extra={})=>({id,drinkId,createdAt:Number(id)||1,taste:'Ferah',rating:null,...extra});
test('preparation tokens deduplicate one completion and keep distinct later preparations, bounded to 100',()=>{
 let rows=[];
 for(let i=1;i<=101;i++)rows=personal.addPreparation(rows,event(String(i),'same-drink'));
 assert.equal(rows.length,100);assert.equal(rows[0].id,'101');assert.equal(rows.at(-1).id,'2');
 assert.equal(personal.addPreparation(rows,event('101','same-drink')),rows);
 assert.equal(personal.addPreparation(rows,event('102','same-drink')).length,100);
});
test('ready suggestions never include missing ingredients and contain at most three unique recipes',()=>{
 const available=[drink('1'),drink('2'),drink('2'),drink('3'),drink('4'),drink('missing',{missing:['Lime']})];
 const result=personal.recommend(available,prefs(),[],options);
 assert.equal(result.ready.length,3);assert.deepEqual(result.nearby,[]);
 assert.equal(result.ready.some(row=>row.missing.length),false);
 const missing=personal.recommend([drink('x',{missing:['Lime']})],prefs(),[],options);
 assert.equal(missing.ready.length,0);assert.deepEqual(missing.nearby[0].missing,['Lime']);
});
test('alcohol preference and active filters are intersected, including custom non-alcoholic spelling',()=>{
 const candidates=[drink('1'),drink('2',{strAlcoholic:'Non_Alcoholic'}),drink('3',{strAlcoholic:'Non alcoholic'})];
 const result=personal.recommend(candidates,{...prefs(),alcohol:'Non_Alcoholic'},[],{...options,allow:d=>d.idDrink!=='3'});
 assert.deepEqual(result.ready.map(row=>row.drink.idDrink),['2']);
 assert.equal(personal.recommend(candidates,{...prefs(),alcohol:'Non_Alcoholic'},[],{...options,allow:d=>d.strAlcoholic==='Alcoholic'}).ready.length,0);
});
test('explicit tastes outrank learned tastes; latest rated dislikes are excluded',()=>{
 const candidates=[drink('explicit'),drink('learned',{taste:'Tatlı'}),drink('disliked'),drink('other',{taste:'Sert'})];
 const history=[event('3','disliked',{rating:'dislike'}),event('2','past',{rating:'like',taste:'Tatlı'}),event('1','disliked',{rating:'like'})];
 const result=personal.recommend(candidates,prefs(),history,options);
 assert.deepEqual(result.ready.map(row=>row.drink.idDrink),['explicit','learned','other']);
 assert.equal(result.ready[0].explicit,true);assert.equal(result.ready[1].learned,true);
});
test('fewer distinct ingredients break score ties and the most recent loses an otherwise equal tie',()=>{
 const result=personal.recommend([drink('a'),drink('b'),drink('c',{req:['Gin','Lime']}),drink('d',{req:['Gin','Gin']})],prefs(),[event('1','a')],options);
 assert.deepEqual(result.ready.map(row=>row.drink.idDrink),['b','d','a']);
});
test('without a taste or rating the existing classics are used, subject to availability',()=>{
 const result=personal.recommend([drink('z'),drink('17212'),drink('11007'),drink('11003')],personal.defaults(),[],options);
 assert.deepEqual(result.ready.map(row=>row.drink.idDrink),['11003','11007','17212']);
 assert.equal(result.personal,false);
 const missing=personal.recommend([drink('z',{missing:['Gin']}),drink('11003',{missing:['Gin','Campari']})],personal.defaults(),[],options);
 assert.equal(missing.nearby[0].drink.idDrink,'11003');
 assert.equal(missing.ready.length,0);
});
