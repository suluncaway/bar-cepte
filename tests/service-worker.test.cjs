const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function worker(fetch) {
 const handlers={},stored=new Map(),installed=[];
 const cache={addAll:async requests=>installed.push(...requests),
  put:async(req,response)=>stored.set(req.url,response),
  match:async(req)=>{const key=typeof req==='string'?req:req.url;for(const [url,response] of stored)if(url.split('?')[0]===key.split('?')[0])return response;}};
 const context={URL,Request,Response,console,fetch,caches:{open:async()=>cache},self:{location:{href:'https://barcepte.com.tr/sw.js'},
  addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>{}}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
 return {handlers,installed,stored};
}
test('new release precaches with reload and app requests revalidate the browser HTTP cache',async()=>{
 let options;const w=worker(async(req,opts)=>{options=opts;return new Response('current code');});
 let pending;w.handlers.install({waitUntil:promise=>pending=promise});await pending;
 assert.ok(w.installed.length>20);assert.ok(w.installed.every(request=>request.cache==='reload'));
 w.handlers.fetch({request:new Request('https://barcepte.com.tr/personal-ui.js?v=43'),respondWith:promise=>pending=promise});
 const response=await pending;assert.equal(await response.text(),'current code');assert.equal(options.cache,'no-cache');
});
test('versioned app assets still fall back to the offline precache',async()=>{
 const w=worker(async()=>{throw new Error('offline');});
 w.stored.set('https://barcepte.com.tr/personal-ui.js',new Response('offline personal UI'));
 let pending;w.handlers.fetch({request:new Request('https://barcepte.com.tr/personal-ui.js?v=43'),respondWith:promise=>pending=promise});
 assert.equal(await (await pending).text(),'offline personal UI');
});
