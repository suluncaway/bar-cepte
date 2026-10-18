/* Business quantities use base units; personal bar data is never read here. */
(function(root){
 'use strict';
 function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
 const text=(value,max=120)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail('Geçersiz metin / Invalid text');return value.trim();};
 const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(value))fail('Geçersiz kimlik / Invalid ID');return value;};
 const quantity=(value,zero=false)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0||(!zero&&value===0)||value>1e9||Math.abs(value*1000-Math.round(value*1000))>0.0001)fail('Geçersiz miktar / Invalid quantity');return value;};
 const round=value=>Math.round(value*1000)/1000;
 function member(state,user){const role=state.members[user.uid]?.role;if(!role)fail('Bu işletmeye erişimin yok / Access denied',403);return role;}
 function apply(original,command,user,now,previous){
  const role=member(original,user),kind=text(command.kind,30),eventId=id(command.id);
  if(!['sale','gift','waste','count','purchase','return','product','product-update','recipe','recipe-update','reverse','invite','revoke','join'].includes(kind))fail('Geçersiz işlem / Invalid operation');
  if(['product','product-update','recipe','recipe-update','purchase','return','reverse','invite','revoke'].includes(kind)&&role!=='owner')fail('Yalnızca işletme sahibi / Owner only',403);
  if(command.data!==undefined&&(!command.data||typeof command.data!=='object'||Array.isArray(command.data)))fail('Geçersiz veri / Invalid data');
  const state=structuredClone(original),data=command.data||{},lines=[];
  let details={},label=kind;
  const product=productId=>{const found=state.products.find(row=>row.id===productId);if(!found)fail('Ürün bulunamadı / Product not found');return found;};
  const move=(productId,delta)=>{quantity(Math.abs(delta),true);const row=product(productId);const next=round(row.stock+delta);if(next<0)fail('Stok yetersiz / Insufficient stock',409);if(next>1e9)fail('Stok sınırı aşıldı / Stock limit exceeded');row.stock=next;lines.push({productId,name:row.name,unit:row.unit,delta:round(delta)});};
  if(['product','product-update'].includes(kind)){
   const existing=kind==='product-update'?product(data.productId):null;
   if(!['ml','g','piece'].includes(data.unit)||(!existing&&state.products.length>=500)||existing&&existing.unit!==data.unit)fail('Geçersiz birim veya ürün sınırı / Invalid unit or product limit');
   if(state.products.some(row=>row.id!==existing?.id&&row.name.toLocaleLowerCase('tr')===String(data.name).trim().toLocaleLowerCase('tr')))fail('Bu ürün zaten var / Product already exists');
   const row={id:existing?.id||eventId,name:text(data.name),unit:data.unit,packSize:quantity(data.packSize),caseSize:quantity(data.caseSize),minimum:quantity(data.minimum,true),stock:existing?.stock||0};
   if(!Number.isInteger(row.caseSize)||row.caseSize>1000)fail('Geçersiz koli adedi / Invalid case size');
   if(existing)state.products[state.products.indexOf(existing)]=row;else state.products.push(row);details={before:existing,after:row};label=row.name;
  }else if(['recipe','recipe-update'].includes(kind)){
   const existing=kind==='recipe-update'?state.recipes.find(row=>row.id===data.recipeId):null;
   if(kind==='recipe-update'&&!existing)fail('Reçete bulunamadı / Recipe not found');
   if(!Array.isArray(data.ingredients)||!data.ingredients.length||data.ingredients.length>50||(!existing&&state.recipes.length>=300))fail('Geçersiz reçete / Invalid recipe');
   const ingredients=data.ingredients.map(row=>({productId:product(row.productId).id,quantity:quantity(row.quantity)}));
   if(new Set(ingredients.map(row=>row.productId)).size!==ingredients.length)fail('Tekrarlanan malzeme / Duplicate ingredient');
   const recipe={id:existing?.id||eventId,name:text(data.name),ingredients};if(existing)state.recipes[state.recipes.indexOf(existing)]=recipe;else state.recipes.push(recipe);label=recipe.name;details={before:existing,recipe};
  }else if(['sale','gift'].includes(kind)){
   const recipe=state.recipes.find(row=>row.id===data.recipeId),count=quantity(data.count);
   if(!recipe||!Number.isInteger(count)||count>10000)fail('Geçersiz reçete / Invalid recipe');
   for(const row of recipe.ingredients)move(row.productId,-round(row.quantity*count));
   label=recipe.name;details={recipeId:recipe.id,count};
  }else if(['purchase','waste','return','count'].includes(kind)){
   const row=product(data.productId),amount=quantity(data.quantity,kind==='count');
   const factor=kind==='purchase'?(data.pack==='case'?row.packSize*row.caseSize:data.pack==='pack'?row.packSize:data.pack==='base'?1:NaN):1;
   if(!Number.isFinite(factor))fail('Geçersiz ambalaj / Invalid pack');
   if(kind==='purchase'&&data.pack!=='base'&&!Number.isInteger(amount))fail('Tam ambalaj adedi gir / Enter whole packs');
   const delta=kind==='count'?round(amount-row.stock):round(amount*factor*(kind==='waste'||kind==='return'?-1:1));
   details=kind==='count'?{expected:row.stock,observed:amount,difference:delta}:{quantity:amount,pack:data.pack||'base'};
   move(row.id,delta);label=row.name;
  }else if(kind==='reverse'){
   if(!previous||!['sale','gift','purchase','waste','return','count'].includes(previous.kind)||state.reversed[previous.id])fail('İşlem ters kaydedilemiyor / Cannot reverse operation',409);
   for(const line of previous.lines)move(line.productId,-line.delta);
   state.reversed[previous.id]=eventId;details={reverses:previous.id};label=previous.label;
  }else if(kind==='invite'){
   state.invites=state.invites.filter(row=>row.expiresAt>now);
   if(state.invites.length>=10)fail('Davet sınırı / Invite limit');
   state.invites.push({hash:data.hash,expiresAt:now+86400000});details={expiresAt:now+86400000};
  }else if(kind==='revoke'){
   if(state.members[data.uid]?.role!=='staff')fail('Personel bulunamadı / Staff not found');
   details={uid:data.uid,name:state.members[data.uid].name};delete state.members[data.uid];
  }else if(kind==='join')fail('Geçersiz katılım yolu / Invalid join route');
  const note=data.note===undefined||data.note===''?'':text(data.note,300);
  if(['waste','return','reverse','count'].includes(kind)&&!note)fail('İşlem nedeni gerekli / Reason required');
  state.revision++;
  return {state,event:{id:eventId,seq:state.revision,kind,label,actor:{uid:user.uid,name:user.name||user.uid},createdAt:now,note,lines,details}};
 }
 function snapshot(state,user){member(state,user);const {invites,...safe}=state;return {...safe,role:state.members[user.uid].role};}
 const api={apply,member,snapshot,id,text,quantity,fail};root.BarBusiness=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
