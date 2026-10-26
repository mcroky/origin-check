import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupDomestic,lookupDomesticIngredients,lookupImportCandidates} from '../src/officialClient';
import {registeredIngredients} from '../src/registeredIngredients';
const code='8801062633692',reportNo='202601010011',source='https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C005',at='2026-10-26T00:00:00Z';
const identity={barcode:code,reportNo,name:'시험 소스',manufacturer:'시험식품',category:'소스',reportedAt:'20260101',endedAt:'',closedAt:''};
test('official browser lookup accepts only the requested barcode and an allowlisted record source',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({code,records:[identity],total:1,bounded:false,source,retrievedAt:at,cached:false});assert.equal((await lookupDomestic(code,new AbortController().signal)).records.length,1);
  globalThis.fetch=async()=>Response.json({code,records:[{...identity,barcode:'036000291452'}],source,retrievedAt:at});await assert.rejects(lookupDomestic(code,new AbortController().signal),/INVALID_RESPONSE/);
  globalThis.fetch=async()=>Response.json({code,records:[identity],source:'javascript:alert(1)',retrievedAt:at});await assert.rejects(lookupDomestic(code,new AbortController().signal),/INVALID_RESPONSE/);
 }finally{globalThis.fetch=original;}
});
test('detail responses cannot move ingredients to another report and private-login HTML is unavailable rather than no product',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({identity,ingredients:[{reportNo:'202601010012',name:'시험 소스',manufacturer:'시험식품',ingredients:'쌀',changedAt:''}],source:'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C002',identitySource:source,retrievedAt:at});await assert.rejects(lookupDomesticIngredients(code,reportNo,new AbortController().signal),/INVALID_RESPONSE/);
  globalThis.fetch=async()=>new Response('<html>Sign in</html>',{headers:{'Content-Type':'text/html'}});await assert.rejects(lookupDomestic(code,new AbortController().signal),/UNAVAILABLE/);
 }finally{globalThis.fetch=original;}
});
test('a failed official source is distinct from not found and abort prevents publishing a stale response',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({error:'UPSTREAM_QUOTA'},{status:429});await assert.rejects(lookupDomestic(code,new AbortController().signal),/UPSTREAM_QUOTA/);
  const controller=new AbortController();globalThis.fetch=async()=>{controller.abort();return Response.json({code,records:[identity],source,retrievedAt:at});};await assert.rejects(lookupDomestic(code,controller.signal),/ABORTED/);
 }finally{globalThis.fetch=original;}
});
test('import candidate response must retain a known dataset and source instead of accepting foreign links',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({code,candidates:[{dataset:'current',source:'https://other.example',retrievedAt:at,record:{}}],failures:[],retrievedAt:at});await assert.rejects(lookupImportCandidates(code,'시험','',new AbortController().signal),/INVALID_RESPONSE/);}finally{globalThis.fetch=original;}
});
test('registered ingredient origin cannot absorb manufacture or exporter country and cross-field contradictions remain uncertain',()=>{
 assert.equal(registeredIngredients(['제조국: 중국\n원재료명: 쌀(미국산)\n수출국: 중국']).status,'not-found');
 assert.equal(registeredIngredients(['원재료명: 쌀(중국산)','원재료명: 중국산 원료 미사용']).status,'uncertain');
 assert.equal(registeredIngredients(['원재료명: 쌀(미국 또는 중국)']).status,'possible');
});
