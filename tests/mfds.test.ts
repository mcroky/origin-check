import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {ApiError,buildUrl,createMfdsClient,parseResponse,validateSearch} from '../server/mfds.ts';
import {createMfdsHandler} from '../server/handler.ts';
// Synthetic contract fixtures, NOT real MFDS records or evidence about a product.
const query={name:'시험 식품',importer:'',language:'ko' as const,page:1};
const row={PRDUCT_KOREAN_NM:'가상 시험 식품',MNF_NTNCD_NM:'중국',XPORT_NTNCD_NM:'일본',BSN_OFC_NAME:'가상 수입사',KORLABEL:'<b>제조국: 중국</b>',IRDNT_NM:'대두(미국)'};
const payload=(items:unknown={item:row},totalCount=1)=>JSON.stringify({header:{resultCode:'00'},body:{totalCount,items}});
const isCode=(code:string)=>(e:unknown)=>e instanceof ApiError&&e.code===code;
test('official query names and one-time key encoding',()=>{for(const key of ['secret+/=','secret%2B%2F%3D']){const u=buildUrl(key,query);assert.equal(u.protocol,'https:');assert.equal(u.searchParams.get('serviceKey'),'secret+/=');assert.equal(u.searchParams.get('prductKoreanNm'),query.name);assert.equal(u.searchParams.get('type'),'json');assert.equal(u.searchParams.get('numOfRows'),'10');}assert.equal(buildUrl('key',{...query,language:'en'}).searchParams.get('prductNm'),query.name);});
test('bounds and whitelist ignore caller-supplied endpoint/key',()=>{assert.deepEqual(validateSearch({...query,url:'https://invalid.example',serviceKey:'other'}),query);for(const value of [{...query,name:'a'},{...query,page:0},{...query,page:101},{...query,page:1.2},{...query,language:'zh'},{...query,name:'x\nxx'}])assert.throws(()=>validateSearch(value),isCode('INVALID_QUERY'));});
test('manufacturing country remains separate from export and ingredients',()=>{const r=parseResponse(payload(),1).records[0];assert.equal(r.manufacturingCountry,'중국');assert.equal(r.exportCountry,'일본');assert.equal(r.ingredients,'대두(미국)');assert.equal(r.label,row.KORLABEL);});
test('missing manufacturing country never falls back to export country',()=>{const r=parseResponse(payload({item:{PRDUCT_KOREAN_NM:'시험',XPORT_NTNCD_NM:'중국'}}),1);assert.equal(r.records[0].manufacturingCountry,'');});
test('supports nested response, item singleton, item array and direct array',()=>{for(const items of [{item:row},{item:[row]},[row]]){const raw=JSON.parse(payload(items));assert.equal(parseResponse(JSON.stringify({response:raw}),2).records.length,1);}});
test('live MFDS shape: each array entry wraps an item',()=>{const result=parseResponse(payload([{item:row},{item:{...row,MNF_NTNCD_NM:'벨기에'}}],2),1);assert.equal(result.records.length,2);assert.deepEqual(result.records.map(r=>r.manufacturingCountry),['중국','벨기에']);assert.equal(result.records[0].name,row.PRDUCT_KOREAN_NM);});
test('explicit empty result is distinct from malformed response',()=>{assert.equal(parseResponse(payload('',0),1).records.length,0);for(const text of ['{}','<html>unavailable</html>','not json',payload({},1),payload({item:{unknown:'value'}})])assert.throws(()=>parseResponse(text,1));});
test('gateway XML and JSON errors map to safe codes',()=>{for(const code of ['20','30','31'])assert.throws(()=>parseResponse(`<OpenAPI_ServiceResponse><returnReasonCode>${code}</returnReasonCode><errMsg>secret</errMsg></OpenAPI_ServiceResponse>`,1),isCode('AUTH_FAILED'));assert.throws(()=>parseResponse(JSON.stringify({header:{resultCode:'22',resultMsg:'secret'}}),1),isCode('UPSTREAM_QUOTA'));});
test('no key means no outbound request',async()=>{let calls=0;const c=createMfdsClient('',async()=>{calls++;return new Response(payload());});await assert.rejects(c.search(query),isCode('NOT_CONFIGURED'));assert.equal(calls,0);});
test('successful response cache and per-client request limit',async()=>{let calls=0;let time=0;const c=createMfdsClient('TEST_SECRET_LONG_VALUE',async()=>{calls++;return new Response(payload());},()=>time);assert.equal((await c.search(query)).cached,false);assert.equal((await c.search(query)).cached,true);assert.equal(calls,1);await assert.rejects(c.search({...query,name:'다른 시험'}),isCode('RATE_LIMITED'));time=300001;await c.search(query);assert.equal(calls,2);});
test('network exceptions do not leak credential or URL',async()=>{const c=createMfdsClient('TEST_SECRET_LONG_VALUE',async url=>{throw Error(String(url));});await assert.rejects(c.search(query),e=>isCode('UPSTREAM_UNAVAILABLE')(e)&&!String(e).includes('TEST_SECRET'));});
test('redirects are forbidden and abort signal is supplied',async()=>{const c=createMfdsClient('TEST_SECRET_LONG_VALUE',async(_url,options)=>{assert.equal(options?.redirect,'error');assert.ok(options?.signal);return new Response(payload());});await c.search(query);});
test('oversize upstream response is rejected',async()=>{const c=createMfdsClient('TEST_SECRET_LONG_VALUE',async()=>new Response('x'.repeat(2_000_001)));await assert.rejects(c.search(query),isCode('RESPONSE_TOO_LARGE'));});
test('upstream credential echo is blocked',async()=>{const c=createMfdsClient('TEST_SECRET_LONG_VALUE',async()=>new Response(payload({item:{...row,KORLABEL:'TEST_SECRET_LONG_VALUE'}})));await assert.rejects(c.search(query),isCode('INVALID_RESPONSE'));});
test('HTTP handler status, validation, same origin and search without exposing key',async()=>{
 const server=createServer(createMfdsHandler('TEST_SECRET_LONG_VALUE',async()=>new Response(payload())));server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`;
 try{assert.deepEqual(await(await fetch(`${base}/api/mfds/status`)).json(),{configured:true});
 const post=(body:unknown,extra={})=>fetch(`${base}/api/mfds/search`,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
 assert.equal((await post(query,{Origin:'https://other.example'})).status,403);assert.equal((await post({...query,name:''})).status,400);assert.equal((await post({name:'x'.repeat(5000)})).status,413);
 const r=await post(query);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const text=await r.text();assert.ok(!text.includes('TEST_SECRET'));assert.equal(JSON.parse(text).records[0].manufacturingCountry,'중국');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
