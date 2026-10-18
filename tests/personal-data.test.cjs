const test = require('node:test');
const assert = require('node:assert/strict');
const security = require('../security');
const record = {id:'one',drinkId:'11003',name:'Negroni',createdAt:1,taste:'Sert',rating:'like',note:'Güzel'};
test('inventory boundary rejects invalid quantities, units, duplicates and oversized event ledgers',()=>{
 const item={ingredient:'Gin',quantity:0,unit:'ml'};
 assert.deepEqual(security.inventory({items:[item]}),{items:[item],deductions:[]});
 for(const value of [{items:[{...item,quantity:-1}]},{items:[{...item,quantity:Infinity}]},{items:[{...item,quantity:'3'}]},
 {items:[{...item,unit:'bottle'}]},{items:[item,item]},{items:[],deductions:Array.from({length:101},(_,i)=>String(i))}])assert.throws(()=>security.backup({inventory:value}));
});
test('stock undo receipts survive validation and reject unbounded, duplicate or forged changes',()=>{
 const receipt={id:'event',name:'Negroni',createdAt:1,undone:false,changes:[{ingredient:'Gin',quantity:3,unit:'cl'}]};
 const value={items:[],deductions:['event'],receipts:[receipt]};
 assert.deepEqual(security.inventory(value),value);
 for(const invalid of [{...value,deductions:[]},{...value,receipts:[receipt,receipt]},
 {...value,receipts:[{...receipt,changes:[{ingredient:'Gin',quantity:0,unit:'cl'}]}]},
 {...value,receipts:[{...receipt,undone:'true'}]}])assert.throws(()=>security.inventory(invalid));
});
test('personal data accepts old backups and validates optional fields before restore', () => {
    assert.deepEqual(security.backup({}), {favorites:[],customs:[],shopping:[],selected:[]});
    const data = security.backup({preferences:{alcohol:'Non_Alcoholic',tastes:['Ferah']},history:[record]});
    assert.equal(data.history[0].note,'Güzel');
    assert.equal(data.preferences.onboardingDone,false);
    for (const bad of [{history:[{...record,note:'x'.repeat(301)}]}, {history:[record,record]},
        {history:Array.from({length:101},(_,i)=>({...record,id:String(i)}))},
        {preferences:{alcohol:'wrong'}},{preferences:{tastes:['wrong']}}, {history:[{...record,createdAt:NaN}]}]) {
        assert.throws(()=>security.backup(bad));
    }
});
