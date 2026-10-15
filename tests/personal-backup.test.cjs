const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const security=require('../security');
const game=fs.readFileSync('game.js','utf8');
const backupCode=game.slice(game.indexOf('async function exportUserData()'),game.indexOf('function pickRandomCocktail()'));
function client(initial={}) {
 const map=new Map(Object.entries(initial));let code='';
 const context={BarSecurity:security,console,db:null,currentLang:'tr',favoriteCocktails:['11003'],customRecipes:[],shoppingList:[],selectedIngredients:['Gin'],
  btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,confirm:()=>true,alert:()=>{},
  location:{reload:()=>{context.reloaded=true;}},document:{getElementById:()=>({value:code})},
  navigator:{clipboard:{writeText:async v=>{code=v;}}},localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
 // security.readStored uses its own root; run the real shared validator in this storage context.
 vm.createContext(context);vm.runInContext(fs.readFileSync('security.js','utf8'),context);vm.runInContext(backupCode,context);
 return {context,map,setCode:value=>{code=value;},getCode:()=>code};
}
test('manual export/import round trips preferences and notes without network; old backups reset optional fields',async()=>{
 const preferences={alcohol:'Non_Alcoholic',tastes:['Ferah'],onboardingDone:true};
 const history=[{id:'one',drinkId:'11003',name:'Çilek',createdAt:1,taste:'Ferah',rating:'like',note:'Şeker ekleme'}];
 const first=client({personalPreferences:JSON.stringify(preferences),preparationHistory:JSON.stringify(history)});
 await first.context.exportUserData();const second=client();second.setCode(first.getCode());await second.context.importUserData();
 assert.deepEqual(JSON.parse(second.map.get('personalPreferences')),preferences);
 assert.deepEqual(JSON.parse(second.map.get('preparationHistory')),history);assert.equal(second.context.reloaded,true);
 second.setCode(JSON.stringify({selected:['Lime']}));await second.context.importUserData();
 assert.equal(second.map.get('preparationHistory'),'[]');
 assert.deepEqual(JSON.parse(second.map.get('personalPreferences')),security.preferences({}));
});
test('invalid personal data cannot partially overwrite the bar',async()=>{
 const value=client({selectedIngredients:'["Gin"]',preparationHistory:'[]'});
 value.setCode(JSON.stringify({selected:['Lime'],history:[{id:'bad',drinkId:'x',name:'bad',createdAt:1,note:'x'.repeat(301)}]}));
 await value.context.importUserData();assert.equal(value.map.get('selectedIngredients'),'["Gin"]');assert.equal(value.context.reloaded,undefined);
});
