const test = require('node:test');
const assert = require('node:assert/strict');
const security = require('../security');
const record = {id:'one',drinkId:'11003',name:'Negroni',createdAt:1,taste:'Sert',rating:'like',note:'Güzel'};
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
