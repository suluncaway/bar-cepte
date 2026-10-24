'use strict';
// One transaction contains the stock update and its immutable audit event.
function createBusinessStore({pool,ready,read,write,file}) {
 let pending=Promise.resolve();
 const serialize=fn=>{const task=pending.then(fn);pending=task.catch(()=>{});return task;};
 const all=()=>read(file,{});
 return {
  async createBusiness(state,event){
   if(!pool)return serialize(()=>{const data=all();if(Object.values(data).some(row=>row.state.owner===state.owner))return null;data[state.id]={state,events:[event]};write(file,data);return state;});
   await ready();const client=await pool.connect();try{
    await client.query('BEGIN');
    const created=await client.query('INSERT INTO barcepte_businesses(id,owner_uid,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING id',[state.id,state.owner,JSON.stringify(state)]);
    if(!created.rowCount){await client.query('ROLLBACK');return null;}
    await client.query('INSERT INTO barcepte_business_events(business_id,event_id,seq,payload) VALUES($1,$2,$3,$4::jsonb)',[state.id,event.id,event.seq,JSON.stringify(event)]);
    await client.query('COMMIT');return state;
   }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  },
  async listBusinesses(uid){if(!pool)return Object.values(all()).filter(row=>row.state.members[uid]).map(row=>row.state);
   await ready();return (await pool.query("SELECT payload FROM barcepte_businesses WHERE payload->'members' ? $1 ORDER BY id",[uid])).rows.map(row=>row.payload);},
  async getBusiness(id){if(!pool)return all()[id]?.state||null;await ready();return (await pool.query('SELECT payload FROM barcepte_businesses WHERE id=$1',[id])).rows[0]?.payload||null;},
  async businessEvents(id,before=Number.MAX_SAFE_INTEGER){if(!pool)return (all()[id]?.events||[]).filter(row=>row.seq<before).sort((a,b)=>b.seq-a.seq).slice(0,100);
   await ready();return (await pool.query('SELECT payload FROM barcepte_business_events WHERE business_id=$1 AND seq<$2 ORDER BY seq DESC LIMIT 100',[id,before])).rows.map(row=>row.payload);},
  async businessReportRows(id,dates,revision){
   const check=rows=>{if(rows.length>50000){const error=new Error('Kayıt sayısı çok yüksek; tarih aralığını daralt / Narrow the date range');error.status=413;throw error;}return rows;};
   if(!pool){const events=all()[id]?.events||[],byId=new Map(events.map(event=>[event.id,event]));return check(events.filter(event=>event.seq<=revision&&event.createdAt>=dates.start&&event.createdAt<dates.end&&['sale','gift','purchase','waste','return','count','reverse'].includes(event.kind)).map(event=>({event,original:byId.get(event.details?.reverses)})));}
   await ready();return check((await pool.query(`SELECT e.payload AS event, r.payload AS original FROM barcepte_business_events e
    LEFT JOIN barcepte_business_events r ON r.business_id=e.business_id AND r.event_id=e.payload->'details'->>'reverses'
    WHERE e.business_id=$1 AND e.seq<=$4 AND (e.payload->>'createdAt')::bigint >= $2 AND (e.payload->>'createdAt')::bigint < $3
    AND e.payload->>'kind' IN ('sale','gift','purchase','waste','return','count','reverse') ORDER BY e.seq LIMIT 50001`,[id,dates.start,dates.end,revision])).rows);
  },
  async businessTransaction(id,fn){
   if(!pool)return serialize(async()=>{const data=all(),row=data[id];if(!row)return null;
    const result=await fn(structuredClone(row.state),async eventId=>row.events.find(event=>event.id===eventId));
    if(result.event){row.state=result.state;row.events.push(result.event);write(file,data);}return result;});
   await ready();const client=await pool.connect();try{
    await client.query('BEGIN');const row=(await client.query('SELECT payload FROM barcepte_businesses WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!row){await client.query('ROLLBACK');return null;}
    const result=await fn(row.payload,async eventId=>(await client.query('SELECT payload FROM barcepte_business_events WHERE business_id=$1 AND event_id=$2',[id,eventId])).rows[0]?.payload);
    if(result.event){await client.query('UPDATE barcepte_businesses SET payload=$2::jsonb WHERE id=$1',[id,JSON.stringify(result.state)]);
     await client.query('INSERT INTO barcepte_business_events(business_id,event_id,seq,payload) VALUES($1,$2,$3,$4::jsonb)',[id,result.event.id,result.event.seq,JSON.stringify(result.event)]);}
    await client.query('COMMIT');return result;
   }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
 };
}
module.exports={createBusinessStore};
