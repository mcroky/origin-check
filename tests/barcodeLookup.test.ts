import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createBarcodeLookup,parseBarcodeResponse,productUrl,normalizeBarcode,sameGtin,LookupError} from '../src/productLookup.ts';
import {barcodeContext} from '../src/BarcodePanel.tsx';
import {IngredientResult} from '../src/IngredientResult.tsx';
const code='8801062633692',at='2026-10-26T04:00:00.000Z';
const payload=(fields:Record<string,unknown>={})=>({code,status:'success',result:{id:'product_found'},product:{code,product_name:'Synthetic food',quantity:'200 g',...fields}});
const response=(data:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
const signal=()=>new AbortController().signal;
test('GTIN normalization preserves leading zeros, accepts separators and validates the check digit',()=>{
 assert.equal(normalizeBarcode(' ０８８０-１０６２６３３６９２ '),'08801062633692');assert.throws(()=>normalizeBarcode('8801062633691'),LookupError);assert.throws(()=>normalizeBarcode('https://example.test/8801062633692'),LookupError);assert(sameGtin(code,'08801062633692'));assert(!sameGtin(code,'0000000000000'));
});
test('lookup URL is fixed to the public food API and carries only a validated product number',()=>{
 const url=productUrl(code,'ko');assert.equal(url.origin,'https://world.openfoodfacts.org');assert.equal(url.pathname,`/api/v3.6/product/${code}.json`);assert.equal(url.searchParams.get('lc'),'ko');assert.equal(url.searchParams.get('app_name'),'RokyOriginCheck');assert(!url.href.includes('serviceKey'));assert.throws(()=>productUrl('../../secret','ko'));
});
test('sales country, ingredient origin, brand and address never supply manufacturing country',()=>{
 const result=parseBarcodeResponse(payload({countries:'China',brands:'China brand',origins:'China',ingredients_text:'Rice',manufacturer:'China address'}),code,'en',at);
 assert.equal(result.kind,'found');if(result.kind!=='found')return;assert.equal(result.product.manufacture.status,'unknown');assert.equal(result.product.ingredients.status,'direct');assert.deepEqual(result.product.missing,['manufacture']);
});
test('explicit manufacturing place is kept separate from ingredient-source alternatives and raw fields',()=>{
 const result=parseBarcodeResponse(payload({manufacturing_places:'South Korea',origins:'China or Japan',ingredients_text:'Flour',last_modified_t:1700000000}),code,'en',at);
 assert.equal(result.kind,'found');if(result.kind!=='found')return;assert.equal(result.product.manufacture.status,'other');assert.deepEqual(result.product.manufacture.countries,['KR']);assert.equal(result.product.ingredients.status,'possible');assert.equal(result.product.raw.origins,'China or Japan');assert(result.product.modifiedAt);assert.equal(result.product.fetchedAt,at);
});
test('an ingredient-text country statement is not promoted to finished-product manufacture',()=>{
 const result=parseBarcodeResponse(payload({ingredients_text:'[PRODUCT OF KOREA]'}),code,'en',at);if(result.kind!=='found')throw Error();assert.equal(result.product.manufacture.status,'unknown');
});
test('city/address ambiguity remains insufficient and ordinary ingredient lists do not establish origins',()=>{
 const result=parseBarcodeResponse(payload({manufacturing_places:'China Road',ingredients_text:'Rice, sugar'}),code,'ko',at);if(result.kind!=='found')throw Error();assert.equal(result.product.manufacture.status,'unknown');assert.deepEqual(result.product.missing,['manufacture','ingredient-origin']);
});
test('localized product and ingredient fields retain their source field',()=>{
 const result=parseBarcodeResponse(payload({product_name_ko:'합성 시험식품',ingredients_text_ko:'귀리(중국산)',ingredients_text_en:'Oats'}),code,'ko',at);if(result.kind!=='found')throw Error();assert.equal(result.product.name,'합성 시험식품');assert.equal(result.product.ingredients.status,'direct');assert.equal(result.product.raw.ingredientsField,'ingredients_text_ko');assert.equal(result.product.ingredients.evidence[0].line,'귀리(중국산)');
});
test('contradictory ingredient statements across database fields require review',()=>{
 const result=parseBarcodeResponse(payload({origins:'China',ingredients_text:'Rice (not from China)'}),code,'en',at);if(result.kind!=='found')throw Error();assert.equal(result.product.ingredients.status,'uncertain');
});
test('a negative country statement alone is still insufficient ingredient-origin information',()=>{
 const result=parseBarcodeResponse(payload({manufacturing_places:'South Korea',origins:'not China'}),code,'en',at);if(result.kind!=='found')throw Error();assert.equal(result.product.ingredients.status,'excluded');assert.deepEqual(result.product.missing,['ingredient-origin']);
});
test('wrong product and malformed failures never become a not-found verdict',()=>{
 assert.throws(()=>parseBarcodeResponse({...payload(),code:'0000000000000'},code,'en',at),/PRODUCT_MISMATCH/);
 assert.throws(()=>parseBarcodeResponse(payload({code:'0000000000000'}),code,'en',at),/PRODUCT_MISMATCH/);
 assert.throws(()=>parseBarcodeResponse({status:'failure',result:{id:'server_error'}},code,'en',at),/BAD_RESPONSE/);
 assert.throws(()=>parseBarcodeResponse('<html>unavailable</html>',code,'en',at),/BAD_RESPONSE/);
});
test('a missing public record is distinct from network/server failures',async()=>{
 const lookup=createBarcodeLookup({fetch:async()=>response({code,status:'failure',result:{id:'product_not_found'}},404),minIntervalMs:0});assert.equal((await lookup(code,'ko',signal())).kind,'not-found');
 const failed=createBarcodeLookup({fetch:async()=>response({},503),minIntervalMs:0});await assert.rejects(failed(code,'ko',signal()),/NETWORK/);
});
test('five-minute memory reuse retains the original retrieval time and no persisted photo or credentials',async()=>{
 let calls=0,clock=Date.parse(at);const lookup=createBarcodeLookup({fetch:async(_url,init)=>{calls++;assert.equal(init?.credentials,'omit');assert.equal(init?.method,'GET');assert.equal(init?.cache,'no-store');assert.equal(init?.body,undefined);return response(payload());},now:()=>clock,minIntervalMs:0});
 const first=await lookup(code,'en',signal());clock+=1000;const cached=await lookup(code,'en',signal());assert.equal(cached.cached,true);assert.equal(cached.fetchedAt,first.fetchedAt);assert.equal(calls,1);clock+=300000;await lookup(code,'en',signal());assert.equal(calls,2);
});
test('request spacing and upstream quota responses prevent repeated queries without retry',async()=>{
 let calls=0;const lookup=createBarcodeLookup({fetch:async()=>{calls++;return response(payload());},now:()=>Date.parse(at)});await lookup(code,'ko',signal());await assert.rejects(lookup('0000000000000','ko',signal()),/RATE_LIMITED/);assert.equal(calls,1);
 const quota=createBarcodeLookup({fetch:async()=>{calls++;return response({},429,{'Retry-After':'60'});},now:()=>Date.parse(at)});await assert.rejects(quota(code,'ko',signal()),(e:unknown)=>e instanceof LookupError&&e.retryAfterMs===60000);await assert.rejects(quota(code,'ko',signal()),/RATE_LIMITED/);assert.equal(calls,2);
});
test('abort and timeout cannot publish or cache a stale response',async()=>{
 const controller=new AbortController();const lookup=createBarcodeLookup({fetch:async()=>{controller.abort();return response(payload());},minIntervalMs:0});await assert.rejects(lookup(code,'ko',controller.signal),/ABORTED/);
 const timed=createBarcodeLookup({fetch:async(_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(Error('abort')))),timeoutMs:5,minIntervalMs:0});await assert.rejects(timed(code,'ko',signal()),/TIMEOUT/);
});
test('oversized/non-JSON responses are rejected',async()=>{
 const large=createBarcodeLookup({fetch:async()=>response(payload(),200,{'Content-Length':'999999'}),minIntervalMs:0});await assert.rejects(large(code,'en',signal()),/BAD_RESPONSE/);
 const html=createBarcodeLookup({fetch:async()=>new Response('maintenance',{headers:{'Content-Type':'text/html'}}),minIntervalMs:0});await assert.rejects(html(code,'en',signal()),/BAD_RESPONSE/);
});
test('photo continuation carries product identity as context without inserting DB values into label text',()=>{
 const result=parseBarcodeResponse(payload({manufacturing_places:'China'}),code,'en',at);const context=barcodeContext(result,code);assert.equal(context?.code,code);assert.equal(context?.lookupState,'found');assert(context?.source.endsWith(code));assert(!('manufacture'in context!));assert(!('text'in context!));assert.equal(barcodeContext(undefined,'wrong'),undefined);
});
test('database ingredient cards disclose a database source instead of implying a user-reviewed label',()=>{
 const result=parseBarcodeResponse(payload({origins:'China'}),code,'ko',at);if(result.kind!=='found')throw Error();const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis:result.product.ingredients,lang:'ko',basis:'database'}));assert(html.includes('공개 DB'));assert(!html.includes('검토한 라벨 원문'));assert(!html.includes('OCR이 놓쳤'));
});
