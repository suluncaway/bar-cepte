/* Physical stock reports, independent of prices and current recipe definitions. */
(function(root){
 'use strict';
 const DAY=86400000,OFFSET=10800000;
 const kinds=new Set(['sale','gift','waste','purchase','return','count','reverse']);
 function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
 const day=timestamp=>new Date(timestamp+OFFSET).toISOString().slice(0,10);
 function range(from,to){
  const parse=value=>{if(typeof value!=='string'||!/^20\d\d-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<2020)fail('Geçersiz tarih / Invalid date');const time=Date.parse(value+'T00:00:00+03:00');if(!Number.isFinite(time)||day(time)!==value)fail('Geçersiz tarih / Invalid date');return time;};
  const start=parse(from),end=parse(to)+DAY;
  if(end<=start)fail('Başlangıç tarihi bitişten sonra olamaz / From date must not follow to date');
  if(end-start>366*DAY)fail('En fazla 366 günlük bir aralık seç / Select up to 366 days');
  return {from,to,start,end,timeZone:'Europe/Istanbul'};
 }
 const counts=()=>({grossSales:0,salesReversals:0,netSales:0,grossGifts:0,giftReversals:0,netGifts:0,reversals:0,movements:0});
 function summarize(rows,dates){
  const totals=counts(),daily=new Map(),recipes=new Map(),products=new Map();
  for(const {event,original} of rows){
   if(!kinds.has(event.kind)||event.createdAt<dates.start||event.createdAt>=dates.end)continue;
   const reverse=event.kind==='reverse',source=reverse?original:event;
   if(!source||!kinds.has(source.kind)||source.kind==='reverse')fail('Invalid original report event',503);
   const date=day(event.createdAt);if(!daily.has(date))daily.set(date,{date,...counts()});const groups=[totals,daily.get(date)];
   const kind=source.kind;
   if(['sale','gift'].includes(kind)){
    const count=source.details?.count;if(!Number.isSafeInteger(count)||count<=0)fail('Invalid serving count',503);
    const recipeId=source.details.recipeId;if(!recipes.has(recipeId))recipes.set(recipeId,{recipeId,name:source.label,...counts()});
    const recipe=recipes.get(recipeId);recipe.name=source.label;groups.push(recipe);
    const key=kind==='sale'?(reverse?'salesReversals':'grossSales'):(reverse?'giftReversals':'grossGifts');
    for(const group of groups)group[key]+=count;
   }
   for(const group of groups){group.movements++;if(reverse)group.reversals++;group.netSales=group.grossSales-group.salesReversals;group.netGifts=group.grossGifts-group.giftReversals;}
   for(const line of event.lines){
    if(!['ml','g','piece'].includes(line.unit)||!Number.isFinite(line.delta))fail('Invalid stock unit',503);
    if(!products.has(line.productId))products.set(line.productId,{productId:line.productId,name:line.name,unit:line.unit,sales:0,gifts:0,waste:0,consumption:0,received:0,supplierReturns:0,countAdjustment:0,netMovement:0});
    const row=products.get(line.productId);if(row.unit!==line.unit)fail('Inconsistent stock units',503);row.name=line.name;
    const delta=Math.round(line.delta*1000);
    const add=(key,amount)=>{const next=row[key]+amount;if(!Number.isSafeInteger(next))fail('Rapor çok büyük; tarih aralığını daralt / Narrow the report date range',413);row[key]=next;};
    add('netMovement',delta);
    if(['sale','gift','waste'].includes(kind)){add(kind==='sale'?'sales':kind==='gift'?'gifts':'waste',-delta);add('consumption',-delta);}
    if(kind==='purchase')add('received',delta);
    if(kind==='return')add('supplierReturns',-delta);
    if(kind==='count')add('countAdjustment',delta);
   }
  }
  const productRows=[...products.values()].map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='number'?value/1000:value]))).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  for(let time=dates.start;time<dates.end;time+=DAY){const date=day(time);if(!daily.has(date))daily.set(date,{date,...counts()});}
  return {totals,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),recipes:[...recipes.values()].sort((a,b)=>b.netSales-a.netSales||a.name.localeCompare(b.name,'tr')),products:productRows};
 }
 function csv(rows,decimalSeparator='.') {return '\ufeff'+rows.map(row=>row.map(value=>{let text=String(value??'');if(typeof value==='number'&&decimalSeparator===',')text=text.replace('.',',');if(typeof value==='string'&&(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text)))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
 const api={day,range,summarize,csv};root.BarBusinessReports=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
