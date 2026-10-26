import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function setup(){
 const handlers=new Map<string,(event:any)=>void>();const fetches:any[]=[];const removed:string[]=[];const writes:any[]=[];let claimed=0,skipped=0;
 const scope='https://example.test/origin-check/';const current=`origin-prototype-/origin-check/-v0.11.2`;
 const old='origin-prototype-/origin-check/-v0.9.1',other='origin-prototype-/another-app/-v0.9.1';
 const cache={addAll:async()=>{},put:async(...args:any[])=>{writes.push(args);},match:async()=>undefined};
 const self={registration:{scope},addEventListener:(name:string,handler:any)=>handlers.set(name,handler),skipWaiting:async()=>{skipped++;},clients:{claim:async()=>{claimed++;}}};
 const caches={open:async()=>cache,keys:async()=>[old,other,current],delete:async(key:string)=>{removed.push(key);return true;}};
 vm.runInNewContext(source,{self,caches,URL,Response,fetch:async(...args:any[])=>{fetches.push(args);return new Response('ok');}});
 const fire=async(name:string,props:Record<string,unknown>={})=>{const pending:Promise<unknown>[]=[];let intercepted=false;handlers.get(name)!({...props,waitUntil:(p:Promise<unknown>)=>pending.push(p),respondWith:(p:Promise<unknown>)=>{intercepted=true;pending.push(p);}});for(let i=0;i<pending.length;i++)await pending[i];return intercepted;};
 return {fire,fetches,removed,writes,counts:()=>({claimed,skipped}),old,other,current};
}
test('new worker activates without reloading pages and deletes only its own older cache',async()=>{
 const s=setup();await s.fire('install');await s.fire('activate');assert.deepEqual(s.counts(),{claimed:1,skipped:1});assert.deepEqual(s.removed,[s.old]);
});
test('release checks, APIs and other projects are outside application cache handling',async()=>{
 const s=setup();for(const url of ['https://example.test/origin-check/updates.json','https://example.test/api/mfds/status','https://example.test/origin-check/api/mfds/status','https://example.test/roky-studio/','https://another.test/origin-check/'])assert.equal(await s.fire('fetch',{request:{url,method:'GET'}}),false);
 assert.equal(s.fetches.length,0);assert.equal(s.writes.length,0);
});
test('navigation revalidates the HTML instead of using a browser HTTP-cache entry',async()=>{
 const s=setup();assert.equal(await s.fire('fetch',{request:{url:'https://example.test/origin-check/',method:'GET',mode:'navigate'}}),true);assert.equal(s.fetches[0][1].cache,'no-cache');assert.equal(s.writes.length,1);
});
