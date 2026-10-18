'use strict';
const {randomBytes,randomUUID,createHash}=require('node:crypto');
const rules=require('../business-rules');
const hash=value=>createHash('sha256').update(value).digest('hex');
function createBusinessService({store,authenticate,clock=Date.now}) {
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 async function handle(req,res,path,readBody){
  if(path!=='/api/business'&&!path.startsWith('/api/business/'))return false;
  try{
   const user=await authenticate(req);if(!user)return json(res,401,{success:false,reason:'Google ile giriş gerekli / Google sign-in required'}),true;
   const parts=path.split('/').filter(Boolean),businessId=parts[2];
   if(path==='/api/business'&&req.method==='GET'){
    const businesses=(await store.listBusinesses(user.uid)).map(state=>({id:state.id,name:state.name,role:state.members[user.uid].role}));
    return json(res,200,{success:true,businesses,businessDataVersion:1}),true;
   }
   if(path==='/api/business'&&req.method==='POST'){
    const data=await readBody(req,262144);if(!data||typeof data!=='object'||Array.isArray(data))rules.fail('Geçersiz veri / Invalid data');const name=rules.text(data.name),id=randomUUID(),now=clock();
    const state={id,name,owner:user.uid,members:{[user.uid]:{name:user.name||user.uid,role:'owner'}},invites:[],products:[],recipes:[],reversed:{},revision:1};
    const event={id:randomUUID(),seq:1,kind:'created',label:name,createdAt:now,actor:{uid:user.uid,name:user.name||user.uid},note:'',lines:[],details:{}};
    if(!await store.createBusiness(state,event))rules.fail('Zaten bir işletmen var / You already own a business',409);
    return json(res,201,{success:true,state:rules.snapshot(state,user)}),true;
   }
   rules.id(businessId);
   if(req.method==='GET'&&parts.length===3){const state=await store.getBusiness(businessId);if(!state)rules.fail('İşletme bulunamadı / Business not found',404);rules.member(state,user);
    return json(res,200,{success:true,state:rules.snapshot(state,user),events:await store.businessEvents(businessId,state.revision+1)}),true;}
   if(req.method==='GET'&&parts[3]==='events'&&parts.length===4){
    const state=await store.getBusiness(businessId);if(!state)rules.fail('Bulunamadı / Not found',404);rules.member(state,user);
    const before=Number(new URL(req.url,'http://localhost').searchParams.get('before')||Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)rules.fail('Geçersiz sayfa / Invalid page');
    return json(res,200,{success:true,events:await store.businessEvents(businessId,before)}),true;
   }
   if(req.method==='POST'&&parts.length===4&&['commands','join'].includes(parts[3])){
    const command=await readBody(req,262144);if(!command||typeof command!=='object'||Array.isArray(command))rules.fail('Geçersiz veri / Invalid data');rules.id(command.id);let invite;
    const result=await store.businessTransaction(businessId,async(state,findEvent)=>{
     if(parts[3]==='join'){
      if(state.members[user.uid])return {state};
      if(await findEvent(command.id))rules.fail('İşlem kimliği kullanılmış / Operation ID already used',409);
      if(typeof command.code!=='string'||!/^[a-f0-9]{48}$/.test(command.code))rules.fail('Geçersiz davet / Invalid invite',403);
      const found=state.invites.find(row=>row.hash===hash(command.code)&&row.expiresAt>clock());if(!found)rules.fail('Davet geçersiz veya süresi doldu / Invalid or expired invite',403);
      if(Object.keys(state.members).length>=30)rules.fail('Personel sınırı / Staff limit');
      const next=structuredClone(state);next.invites=next.invites.filter(row=>row.hash!==found.hash);next.members[user.uid]={name:user.name||user.uid,role:'staff'};next.revision++;
      return {state:next,event:{id:command.id,seq:next.revision,kind:'join',label:user.name||user.uid,actor:{uid:user.uid,name:user.name||user.uid},createdAt:clock(),lines:[],details:{},note:''}};
     }
     rules.member(state,user);
     if(await findEvent(command.id))return {state};
     if(!Number.isSafeInteger(command.revision)||command.revision!==state.revision)rules.fail('Başka kullanıcı değişiklik yaptı. Yenile ve tekrar dene. / Data changed. Refresh and retry.',409);
     if(command.kind==='invite'){invite=randomBytes(24).toString('hex');command.data={hash:hash(invite)};}
     const previous=command.kind==='reverse'?await findEvent(command.data?.eventId):null;
     return rules.apply(state,command,user,clock(),previous);
    });
    if(!result)rules.fail('İşletme bulunamadı / Business not found',404);
    return json(res,200,{success:true,state:rules.snapshot(result.state,user),...(invite?{invite:businessId+'.'+invite}:{})}),true;
   }
   json(res,405,{success:false,reason:'Method not allowed'});return true;
  }catch(error){const status=error.status||(/Payload Too Large/.test(error.message)?413:/Invalid JSON/.test(error.message)?400:503);json(res,status,{success:false,reason:status===503?'İşletme servisine ulaşılamıyor / Business service unavailable':error.message});return true;}
 }
 return {handle};
}
module.exports={createBusinessService};
