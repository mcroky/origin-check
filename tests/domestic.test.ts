import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {barcodeRows,ingredientRows,parseFoodSafety,foodSafetyUrl,createDomesticClient} from '../server/domestic';
import {createOfficialHandler} from '../server/originApi';
import {sqlBudget,memoryBudget,budgetedFetch,clientBudget,type SqlStore} from '../server/originQuota';
const code='8801062633692',reportNo='202601010011';
const row={BAR_CD:code,PRDLST_REPORT_NO:reportNo,PRDLST_NM:'테스트 소스',BSSH_NM:'시험식품',PRDLST_DCNM:'소스',SITE_ADDR:'대한민국 서울',PRMS_DT:'20260101',END_DT:'',CLSBIZ_DT:''};
const ingredient={PRDLST_REPORT_NO:reportNo,PRDLST_NM:row.PRDLST_NM,BSSH_NM:row.BSSH_NM,RAWMTRL_NM:'곡물(중국 또는 미국), 소금',CHNG_DT:'20260102'};
const payload=(service:'C005'|'C002',rows:unknown[],total=rows.length)=>JSON.stringify({[service]:{RESULT:{CODE:'INFO-000'},row:rows,total_count:String(total)}});
const secret='synthetic-test-key-not-a-credential';
test('domestic URL uses only the official TLS host and a validated exact barcode or report number',()=>{
 const url=new URL(foodSafetyUrl(secret,'C005',code));assert.equal(url.origin,'https://openapi.foodsafetykorea.go.kr');assert(url.pathname.endsWith('/BAR_CD='+code));assert.throws(()=>foodSafetyUrl(secret,'C005','https://example.test'));assert.throws(()=>foodSafetyUrl(secret,'C002','123&name=x'));
});
test('barcode aliases retain exact identity while prefix and manufacturer address never produce a country verdict',()=>{
 const records=barcodeRows([row,{...row,BAR_CD:'8800000000000'},{...row,BAR_CD:'0'+code}],code);assert.equal(records.length,1);assert.equal(records[0].reportNo,reportNo);assert(!('manufacturingCountry'in records[0]));assert(!('SITE_ADDR'in records[0]));
});
test('ingredient records join by report number, product name and manufacturer and preserve origin qualifiers',()=>{
 const identity=barcodeRows([row],code)[0];assert.equal(ingredientRows([ingredient],identity)[0].ingredients,ingredient.RAWMTRL_NM);
 for(const change of [{PRDLST_REPORT_NO:'202601010012'},{PRDLST_NM:'다른 소스'},{BSSH_NM:'다른 회사'}])assert.throws(()=>ingredientRows([{...ingredient,...change}],identity),/PRODUCT_MISMATCH/);
});
test('food safety authorization, quota, empty records and malformed data are different outcomes',()=>{
 assert.deepEqual(parseFoodSafety(JSON.stringify({C005:{RESULT:{CODE:'INFO-200'}}}),'C005'),{rows:[],total:0});
 assert.throws(()=>parseFoodSafety(JSON.stringify({C005:{RESULT:{CODE:'INFO-110'}}}),'C005'),/FOODSAFETY_AUTH_FAILED/);
 assert.throws(()=>parseFoodSafety(JSON.stringify({C005:{RESULT:{CODE:'INFO-300'}}}),'C005'),/UPSTREAM_QUOTA/);
 assert.throws(()=>parseFoodSafety(payload('C005',[row],0),'C005'),/INVALID_RESPONSE/);assert.throws(()=>parseFoodSafety('html','C005'),/INVALID_RESPONSE/);
});
test('cached identities retain retrieval date and source while a detail reuses the exact identity request',async()=>{
 let clock=1000000,calls=0;const client=createDomesticClient(secret,async input=>{calls++;return new Response(String(input).includes('/C005/')?payload('C005',[row]):payload('C002',[ingredient]));},()=>clock);
 const first=await client.lookup(code);clock+=1000;const detail=await client.detail(code,reportNo),cached=await client.lookup(code);assert.equal(calls,2);assert.equal(cached.retrievedAt,first.retrievedAt);assert(cached.cached);assert.equal(detail.identity.reportNo,reportNo);assert.equal(detail.ingredients.length,1);
});
test('upstream credential echoes and unconfigured keys are never returned as product data',async()=>{
 const client=createDomesticClient(secret,async()=>new Response(payload('C005',[{...row,PRDLST_NM:secret}])));await assert.rejects(client.lookup(code),/INVALID_RESPONSE/);await assert.rejects(createDomesticClient('').lookup(code),/FOODSAFETY_NOT_CONFIGURED/);
});
const request=(path:string,input:unknown,origin='https://mcroky.github.io')=>new Request('https://origin.example/api/origin/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
test('public API CORS allows the published app, rejects other origins and keeps keys server-side',async()=>{
 let calls=0;const handler=createOfficialHandler({mfdsKey:secret,foodSafetyKey:secret,fetcher:async()=>{calls++;return new Response(payload('C005',[row]));}});
 const denied=await handler(request('barcode',{code},'https://other.example'));assert.equal(denied.status,403);assert.equal(calls,0);assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
 const ok=await handler(request('barcode',{code}));assert.equal(ok.status,200);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),'https://mcroky.github.io');const raw=await ok.text();assert(!raw.includes(secret));assert(!raw.includes('serviceKey'));assert.equal(ok.headers.get('Cache-Control'),'no-store');
});
test('malformed inputs and oversized bodies cannot consume upstream calls',async()=>{
 let calls=0;const handler=createOfficialHandler({mfdsKey:secret,foodSafetyKey:secret,fetcher:async()=>{calls++;throw Error();}});
 assert.equal((await handler(request('barcode',{code:'880'}))).status,400);assert.equal((await handler(request('barcode',{code,padding:'x'.repeat(3000)}))).status,413);assert.equal(calls,0);
});
test('status presence is not presented as upstream approval and missing keys are not not-found results',async()=>{
 const handler=createOfficialHandler({mfdsKey:'',foodSafetyKey:''});const status=await handler(new Request('https://origin.example/api/origin/status'));assert.deepEqual(await status.json(),{domesticConfigured:false,importConfigured:false});assert.equal((await handler(request('barcode',{code}))).status,503);
});
test('import lookup keeps two source traces and returns candidates without automatically confirming barcode identity',async()=>{
 let clock=1000000;const calls:string[]=[];const handler=createOfficialHandler({mfdsKey:secret,foodSafetyKey:'',now:()=>clock,pause:async()=>{clock+=1100;},fetcher:async input=>{calls.push(new URL(String(input)).pathname);return Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:[{item:{PRDUCT_KOREAN_NM:'테스트 소스',MNF_NTNCD_NM:'중국',IRDNT_NM:'곡물(미국산)',KORLABEL:'제조국: 중국\n원재료명: 곡물(미국산)'}}]}}});}});
 const response=await handler(request('imports',{code,name:'테스트 소스',language:'ko'}));const result=await response.json();assert.equal(response.status,200);assert.equal(calls.length,2);assert.equal(result.candidates.length,2);assert.notEqual(result.candidates[0].source,result.candidates[1].source);assert.equal(result.candidates[0].record.manufacturingCountry,'중국');assert(!('identityConfirmed'in result));
});
test('one failed import source does not erase another successful source or imply complete absence',async()=>{
 let clock=1000000;const handler=createOfficialHandler({mfdsKey:secret,foodSafetyKey:'',now:()=>clock,pause:async()=>{clock+=1100;},fetcher:async input=>String(input).includes('LabelingText')?new Response('not JSON'):Response.json({response:{header:{resultCode:'00'},body:{totalCount:0,items:[]}}})});
 const result=await(await handler(request('imports',{code,name:'테스트',language:'ko'}))).json();assert.equal(result.candidates.length,0);assert.equal(result.failures.length,1);assert.equal(result.failures[0].dataset,'legacy');
});
test('quota errors prevent additional import requests',async()=>{
 let calls=0;const handler=createOfficialHandler({mfdsKey:secret,foodSafetyKey:'',fetcher:async()=>{calls++;return new Response('',{status:429});},pause:async()=>{}});const result=await(await handler(request('imports',{code,name:'테스트',language:'ko'}))).json();assert.equal(calls,1);assert.equal(result.failures[0].error,'UPSTREAM_QUOTA');
});
test('shared SQL quota atomically caps concurrent requests and cleans expired counters',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE origin_budget (bucket TEXT PRIMARY KEY, used INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
 const adapter:SqlStore={prepare:sql=>({bind:(...values)=>({first:async<T>()=>db.prepare(sql).get(...values as (string|number)[]) as T??null,run:async()=>db.prepare(sql).run(...values as (string|number)[])})})};
 const limiter=sqlBudget(adapter,()=>10000000),outcomes=await Promise.allSettled(Array.from({length:12},()=>limiter.consume('same',5,20000000)));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,5);assert.equal(db.prepare('SELECT used FROM origin_budget').get()?.used,5);db.close();
});
test('per-client quota stores a rotating hash instead of the IP or API credential',async()=>{
 const keys:string[]=[];await clientBudget(new Request('https://origin.example',{headers:{'cf-connecting-ip':'192.0.2.1'}}),{consume:async key=>{keys.push(key);}},secret,()=>1000);assert.equal(keys.length,1);assert(!keys[0].includes('192.0.2.1'));assert(!keys[0].includes(secret));
});
test('upstream quota wrapper rejects arbitrary hosts and stops before a source hour budget is exceeded',async()=>{
 let calls=0;const fetcher=budgetedFetch(memoryBudget(()=>1000),async()=>{calls++;return new Response('{}');},()=>1000);await assert.rejects(fetcher('https://other.example'),/UPSTREAM_NOT_ALLOWED/);for(let i=0;i<60;i++)await fetcher('https://openapi.foodsafetykorea.go.kr/api/key/C005/json/1/1');await assert.rejects(fetcher('https://openapi.foodsafetykorea.go.kr/api/key/C005/json/1/1'),/RATE_LIMITED/);assert.equal(calls,60);
});
