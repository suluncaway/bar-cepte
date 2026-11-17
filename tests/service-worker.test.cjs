const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function worker(fetch,timers={}) {
 const handlers={},stored=new Map(),installed=[];
 const cache={addAll:async requests=>installed.push(...requests),
  put:async(req,response)=>stored.set(req.url,response),
  match:async(req,options={})=>{const key=typeof req==='string'?req:req.url;
   if(!options.ignoreSearch)return stored.get(key);
   for(const [url,response] of stored)if(url.split('?')[0]===key.split('?')[0])return response;}};
 const context={URL,Request,Response,console,fetch,setTimeout:timers.setTimeout||setTimeout,clearTimeout,caches:{open:async()=>cache},self:{location:{href:'https://barcepte.com.tr/sw.js'},
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

test('exact cached ?v= copy wins over an older precached file when offline',async()=>{
 const w=worker(async()=>{throw new Error('offline');});
 w.stored.set('https://barcepte.com.tr/game.js',new Response('old precache'));
 w.stored.set('https://barcepte.com.tr/game.js?v=99',new Response('current versioned'));
 let pending;w.handlers.fetch({request:new Request('https://barcepte.com.tr/game.js?v=99'),respondWith:promise=>pending=promise});
 assert.equal(await (await pending).text(),'current versioned');
});
test('slow network falls back to the cache after the timeout and still refreshes it',async()=>{
 let release;const slowFetch=()=>new Promise(resolve=>{release=()=>resolve(new Response('fresh code'));});
 const w=worker(slowFetch,{setTimeout:(fn)=>setTimeout(fn,0)});
 w.stored.set('https://barcepte.com.tr/game.js',new Response('cached code'));
 let pending,background;
 w.handlers.fetch({request:new Request('https://barcepte.com.tr/game.js'),respondWith:p=>pending=p,waitUntil:p=>background=p});
 assert.equal(await (await pending).text(),'cached code');
 release();await background;
 assert.equal(await w.stored.get('https://barcepte.com.tr/game.js').text(),'fresh code');
});
test('worker cache name was bumped for this release',()=>{
 assert.doesNotMatch(fs.readFileSync('sw.js','utf8'),/bar-cepte-v82-icons/);
});
test('every versioned script and stylesheet in index.html is precached and served by the worker',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const refs=[...html.matchAll(/<(?:script|link rel="stylesheet")[^>]*\b(?:src|href)="([a-z0-9-]+\.(?:js|css)(?:\?v=\d+)?)"/g)].map(m=>m[1]);
 assert.ok(refs.some(r=>/^reserve\.js\?v=\d+$/.test(r)),'reserve.js is versioned');
 assert.ok(refs.filter(r=>r.includes('?v=')).length>=15);
 const w=worker(async req=>new Response('fresh '+new URL(req.url).pathname));
 let pending;w.handlers.install({waitUntil:promise=>pending=promise});await pending;
 const precached=new Set(w.installed.map(request=>new URL(request.url).pathname));
 for(const ref of refs) {
  const url=new URL(ref,'https://barcepte.com.tr/');
  assert.ok(precached.has(url.pathname),`${ref} is precached for offline use`);
  let answered=null;w.handlers.fetch({request:new Request(url.href),respondWith:promise=>answered=promise,waitUntil:()=>{}});
  assert.ok(answered,`${ref} is handled by the worker`);
  assert.equal(await (await answered).text(),'fresh '+url.pathname);
 }
});
test('the app cache name changes with this release so older caches are cleared',()=>{
 const source=fs.readFileSync('sw.js','utf8');
 const version=Number(source.match(/const CACHE_NAME = 'bar-cepte-v(\d+)-/)[1]);
 assert.ok(version>=85,'cache version was raised past v84');
});
