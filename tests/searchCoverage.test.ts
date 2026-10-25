import test from 'node:test';import assert from 'node:assert/strict';
import {assistedSearch,searchQueries,importerCore,rankRecords} from '../src/assistedSearch';
import {buildUrl,parseResponse,validateSearch,createMfdsClient,type SearchInput,type MfdsRecord,type SearchResult} from '../server/mfds';
import {compareProductOrigin} from '../src/productMatch';
const query:SearchInput={name:'시험 소스',importer:'주식회사 시험업체',language:'ko',page:1,dataset:'legacy'};
const record=(size:string):MfdsRecord=>({name:`시험 소스 ${size}`,englishName:'',importer:'시험업체',manufacturer:'SYNTHETIC',manufacturingCountry:'중국',exportCountry:'',category:'',processedAt:'',expiry:'',expiryStart:'',expiryEnd:'',label:`내용량 ${size}`,ingredients:''});
const response=(q:SearchInput,records:MfdsRecord[],total=records.length):SearchResult=>({records,total,page:q.page,pageSize:10,retrievedAt:`2026-10-25T12:00:0${q.page}Z`,source:'https://www.data.go.kr/data/15110213/openapi.do',cached:false});
test('legacy source is whitelisted and preserves source',()=>{
 const url=buildUrl('SYNTHETIC_SECRET',query);assert.equal(url.pathname,'/1471000/IprtFoodPrdtKoreanLabelingText/getIprtFoodPrdtKoreanLabelingText');assert.equal(url.searchParams.get('bsnOfcName'),query.importer);
 assert.throws(()=>validateSearch({...query,dataset:'https://evil.example'}));assert.equal(validateSearch(query).dataset,'legacy');
 const parsed=parseResponse(JSON.stringify({header:{resultCode:'00'},body:{totalCount:1,items:[{item:{PRDUCT_KOREAN_NM:'시험',KORLABEL:'원문',MNF_NTNCD_NM:'중국'}}]}}),1,'legacy');assert.equal(parsed.source,response(query,[]).source);assert.equal(parsed.records[0].label,'원문');
});
test('current and legacy datasets cannot share a cached response',async()=>{
 let now=0,calls=0;const client=createMfdsClient('SYNTHETIC_SECRET',async()=>{calls++;return new Response(JSON.stringify({header:{resultCode:'00'},body:{totalCount:0,items:''}}));},()=>now);
 const current=await client.search({...query,dataset:'current'});now=1100;const legacy=await client.search(query);await client.search(query);assert.equal(calls,2);assert.notEqual(current.source,legacy.source);
});
test('legal notation and spacing variants never remove importer or invent product words',()=>{
 for(const name of ['주식회사 오뚜기','(주)오뚜기','오뚜기㈜','오뚜기 주식회사'])assert.equal(importerCore(name),'오뚜기');
 const variants=searchQueries(query);assert.ok(variants.length<=6);assert.ok(variants.some(q=>q.name==='시험소스'));assert.ok(variants.some(q=>q.importer==='시험업체'));assert.ok(variants.every(q=>q.importer&&q.dataset==='legacy'));assert.ok(!searchQueries({...query,importer:'(주)'}).some(q=>!q.importer));
});
test('later-page matching size retains exact page, row and source despite deduplication/ranking',async()=>{
 const a=record('150ml'),b=record('60ml');const calls:number[]=[];
 const value=await assistedSearch(query,{enabled:true,signal:new AbortController().signal,request:async q=>{calls.push(q.page);return response(q,q.page===1?[a]:[a,b],20);}});
 assert.deepEqual(calls,[1,2]);assert.equal(value.result.records.length,2);assert.equal(value.origins[1].query.page,2);assert.equal(value.origins[1].index,1);assert.equal(value.origins[1].retrievedAt,'2026-10-25T12:00:02Z');assert.equal(value.origins[1].source,value.result.source);
 assert.equal(rankRecords(value.result.records,query.name,'60ml')[0].record,b);assert.equal(compareProductOrigin('제조국 중국',a,true,'60ml').basis,'differentProduct');assert.equal(value.bounded,false);
});
test('automatic scanning is limited to three pages and does not claim exhausted coverage',async()=>{
 let calls=0;const value=await assistedSearch(query,{enabled:true,signal:new AbortController().signal,request:async q=>{calls++;return response(q,[{...record('150ml'),processedAt:String(q.page)}],200);}});assert.equal(calls,3);assert.equal(value.result.page,3);assert.equal(value.bounded,true);
});
test('six-call budget includes zero-result variants and pagination',async()=>{
 let calls=0;const value=await assistedSearch({...query,name:'가상 브랜드 시험 소스'},{enabled:true,signal:new AbortController().signal,request:async q=>{calls++;return response(q,calls<5?[]:[{...record('150ml'),processedAt:String(q.page)}],calls<5?0:200);}});assert.equal(calls,6);assert.equal(value.attempts.length,6);assert.equal(value.bounded,true);
});
test('later-page quota failure preserves candidates and provenance without retry',async()=>{
 let calls=0;const value=await assistedSearch(query,{enabled:true,signal:new AbortController().signal,request:async q=>{if(++calls===2)throw Error('UPSTREAM_QUOTA');return response(q,[record('150ml')],30);}});assert.equal(calls,2);assert.equal(value.partialError,'UPSTREAM_QUOTA');assert.equal(value.result.records.length,1);assert.equal(value.origins[0].query.page,1);assert.equal(value.query.page,1);assert.equal(value.bounded,true);
});
test('abort during pagination never publishes partial candidates',async()=>{
 const controller=new AbortController();let calls=0;await assert.rejects(assistedSearch(query,{enabled:true,signal:controller.signal,pause:async()=>controller.abort(),request:async q=>{calls++;return response(q,[record('150ml')],50);}}));assert.equal(calls,1);
});
test('a dataset shrinking to zero during pagination does not relabel earlier records as a zero result',async()=>{
 const value=await assistedSearch(query,{enabled:true,signal:new AbortController().signal,request:async q=>response(q,q.page===1?[record('150ml')]:[],q.page===1?30:0)});
 assert.equal(value.partialError,'RESULTS_CHANGED');assert.equal(value.result.total,30);assert.equal(value.result.page,1);assert.equal(value.result.records.length,1);assert.equal(value.origins[0].query.page,1);
});
