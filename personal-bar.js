/* Pure personal-bar rules; shared by the browser and regression tests. */
(function(root) {
    'use strict';
    const defaults = () => ({alcohol:'all', tastes:[], onboardingDone:false});
    function mergeShopping(list, missing, key = name => name.trim().toLowerCase()) {
        const result = [], seen = new Set();
        for (const name of [...list, ...missing]) {
            const identity = key(name);
            if (!identity || seen.has(identity)) continue;
            seen.add(identity); result.push(name);
        }
        return result;
    }
    function servings(value) { return [1,2,4,8].includes(Number(value)) ? Number(value) : 1; }
    function scaleMeasure(measure, multiplier = 1) {
        multiplier = servings(multiplier);
        if (!measure || multiplier === 1) return measure || '';
        return measure.replace(/\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?/g, token => {
            let value;
            if (token.includes('/')) {
                const parts=token.trim().split(/\s+/), fraction=parts.pop().split('/').map(Number);
                if (!fraction[1]) return token;
                value=(Number(parts[0])||0)+fraction[0]/fraction[1];
            } else value=Number(token.replace(',','.'));
            return String(Math.round(value*multiplier*1000)/1000);
        });
    }
    function addPreparation(history, record) {
        if (history.some(row => row.id === record.id)) return history;
        return [record, ...history].sort((a,b) => b.createdAt-a.createdAt).slice(0,100);
    }
    function alcoholMatches(drink, preference) {
        if (preference === 'all') return true;
        const kind = String(drink.strAlcoholic || '').toLowerCase().replace(/[_\s]/g,'');
        return preference === 'Alcoholic' ? ['alcoholic','optionalalcohol'].includes(kind) : kind === 'nonalcoholic';
    }
    function recommend(candidates, preferences, history, {allow = () => true, missing, requirements, taste}) {
        const latest = new Map();
        [...history].sort((a,b)=>b.createdAt-a.createdAt).forEach(row => {
            if (row.rating && !latest.has(row.drinkId)) latest.set(row.drinkId,row);
        });
        const likedTastes = new Set([...latest.values()].filter(row=>row.rating==='like').map(row=>row.taste));
        const personal = preferences.tastes.length > 0 || latest.size > 0;
        const classics = ['11003','11007','17212'];
        const recent = history[0]?.drinkId;
        const unique = [...new Map(candidates.map(drink=>[drink.idDrink,drink])).values()];
        const rows = unique.filter(drink => allow(drink) && alcoholMatches(drink,preferences.alcohol) &&
            latest.get(drink.idDrink)?.rating !== 'dislike' && requirements(drink).length > 0)
            .map(drink => {
                const profile = taste(drink);
                const explicit = preferences.tastes.includes(profile);
                const learned = likedTastes.has(profile);
                return {drink, missing:missing(drink), taste:profile, explicit, learned,
                    count:new Set(requirements(drink).map(s=>s.toLowerCase().trim())).size};
            });
        rows.sort((a,b) => Number(a.missing.length>0)-Number(b.missing.length>0) ||
            (personal ? a.missing.length-b.missing.length || Number(b.explicit)-Number(a.explicit) || Number(b.learned)-Number(a.learned) :
                (classics.includes(a.drink.idDrink)?classics.indexOf(a.drink.idDrink):99) -
                (classics.includes(b.drink.idDrink)?classics.indexOf(b.drink.idDrink):99)) ||
            a.count-b.count || Number(a.drink.idDrink===recent)-Number(b.drink.idDrink===recent) ||
            a.drink.idDrink.localeCompare(b.drink.idDrink));
        // Never mix incomplete recipes into the ready recommendations.
        const ready = rows.filter(row=>row.missing.length===0);
        return {ready:ready.slice(0,3), nearby:ready.length?[]:rows.slice(0,3), personal};
    }
    const api = {defaults, addPreparation, alcoholMatches, recommend, mergeShopping, servings, scaleMeasure};
    root.BarPersonal = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
