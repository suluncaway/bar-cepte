/* Quantity rules shared by recipe matching, preparation and regression tests. */
(function(root) {
    'use strict';
    const units = {ml:['volume',1],cl:['volume',10],oz:['volume',29.5735295625],g:['mass',1],piece:['count',1]};
    const empty = () => ({items:[],deductions:[],receipts:[]});
    const round = n => Math.round(n*1000)/1000;
    function measure(raw) {
        const match=String(raw||'').trim().toLowerCase().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(ml|cl|oz|g|gr|grams?|adet|pieces?)?\s*$/);
        if(!match)return null;
        let amount;
        if(match[1].includes('/')) {
            const parts=match[1].split(/\s+/),fraction=parts.pop().split('/').map(Number);
            if(!fraction[1])return null;
            amount=(Number(parts[0])||0)+fraction[0]/fraction[1];
        } else amount=Number(match[1].replace(',','.'));
        const unit=match[2]?.replace(/^(gr|gram|grams)$/,'g').replace(/^(adet|piece|pieces)$/,'piece')||'piece';
        return {quantity:amount,unit};
    }
    function ingredients(drink) {
        if(drink.isCustom)return (drink.customIngredients||[]).map(raw=>{
            const parts=raw.match(/^([\d\s\/.,-]+(?:(?:ml|oz|cl|dashes|dash|tsp|tbsp|grams|gram|gr|g|shot|adet|pieces|piece)\b)?)\s*(.*)$/i);
            return {name:parts?.[2]?.trim()||raw,measure:parts?.[1]?.trim()||''};
        });
        return Array.from({length:15},(_,i)=>({name:drink['strIngredient'+(i+1)]?.trim(),measure:drink['strMeasure'+(i+1)]?.trim()||''})).filter(row=>row.name);
    }
    function assess(drink, selected, inventory, matches, servings=1) {
        servings=[1,2,4,8].includes(Number(servings))?Number(servings):1;
        const totals=new Map();
        const rows=ingredients(drink).map(row=>{
            const ingredient=selected.find(id=>id.toLowerCase()===row.name.toLowerCase()) || selected.find(id=>matches(row.name,id));
            const stock=inventory.items.find(item=>item.ingredient===ingredient);
            const needed=measure(row.measure);
            const compatible=!!(stock && needed && units[stock.unit][0]===units[needed.unit][0]);
            if(compatible)totals.set(ingredient,(totals.get(ingredient)||0)+needed.quantity*units[needed.unit][1]*servings/units[stock.unit][1]);
            return {...row,ingredient,stock,needed,compatible};
        });
        return rows.map(row=>{
            const required=row.compatible?totals.get(row.ingredient):null;
            return {...row,required,missing:!row.ingredient || row.stock?.quantity===0 || (required!==null && row.stock.quantity+0.000001<required),
                unchecked:!!row.ingredient && !row.compatible};
        });
    }
    function deduct(inventory, rows, eventId, name, createdAt=Date.now()) {
        if(inventory.deductions.includes(eventId))return {inventory,already:true,changed:[]};
        if(rows.some(row=>row.missing))return {inventory,insufficient:true,changed:[]};
        const costs=new Map(rows.filter(row=>row.compatible && row.required>0).map(row=>[row.ingredient,row.required]));
        if(!costs.size)return {inventory,changed:[]};
        const items=inventory.items.map(item=>costs.has(item.ingredient)?{...item,quantity:round(Math.max(0,item.quantity-costs.get(item.ingredient)))}:{...item});
        const changes=inventory.items.filter(item=>costs.has(item.ingredient)).map(item=>({...item,quantity:round(item.quantity-items.find(row=>row.ingredient===item.ingredient).quantity)})).filter(item=>item.quantity>0);
        if(!changes.length)return {inventory,changed:[]};
        const deductions=[eventId,...inventory.deductions].slice(0,100);
        const receipts=[{id:eventId,name,createdAt,undone:false,changes},...(inventory.receipts||[])].filter(row=>deductions.includes(row.id)).slice(0,100);
        return {inventory:{items,deductions,receipts},changed:changes};
    }
    function undo(inventory,eventId) {
        const receipt=inventory.receipts?.find(row=>row.id===eventId);
        if(!receipt || receipt.undone)return {inventory,already:true};
        const restored=new Map();
        for(const change of receipt.changes) {
            const current=inventory.items.find(row=>row.ingredient===change.ingredient);
            if(!current || units[current.unit][0]!==units[change.unit][0])return {inventory,conflict:true};
            const quantity=round(current.quantity+change.quantity*units[change.unit][1]/units[current.unit][1]);
            if(quantity>1000000)return {inventory,conflict:true};
            restored.set(current.ingredient,quantity);
        }
        return {inventory:{...inventory,items:inventory.items.map(item=>restored.has(item.ingredient)?{...item,quantity:restored.get(item.ingredient)}:{...item}),
            receipts:inventory.receipts.map(row=>row.id===eventId?{...row,undone:true}:row)}};
    }
    const api={empty,measure,ingredients,assess,deduct,undo,units};root.BarInventory=api;
    if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
