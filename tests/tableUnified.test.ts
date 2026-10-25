import test from 'node:test';import assert from 'node:assert/strict';
import {darkTableRows,tableCells,tableRowPixels} from '../src/tableImage';
import {mergeOcrFields,chooseOcrText,type OcrPass} from '../src/ocrSelection';
import {recoverQuantity} from '../src/quantity';import {searchDatasets,searchQueries,importerSearchPrefix,recordName,rankRecords} from '../src/assistedSearch';
import {validateSearch,type SearchInput,type SearchResult,type MfdsRecord} from '../server/mfds';
const q:SearchInput={name:'가상 브랜드 시험 소스',language:'ko',importer:'주식회사 시험업체',page:1};
const record=(name='가상 소스 60ml'):MfdsRecord=>({name,englishName:'',importer:'시험업체',manufacturer:'SYNTHETIC',manufacturingCountry:'중국',exportCountry:'',category:'',processedAt:'',expiry:'',expiryStart:'',expiryEnd:'',label:'내용량 60ml',ingredients:''});
const response=(query:SearchInput,records:MfdsRecord[],total=records.length):SearchResult=>({records,total,page:query.page,pageSize:10,retrievedAt:`2026-10-25T10:00:0${query.page}Z`,source:query.dataset==='legacy'?'legacy-test':'current-test',cached:false});
test('dark table detection rejects plain/light images and keeps row crop bounded',()=>{
 const width=240,height=300,data=new Uint8ClampedArray(width*height*4).fill(255);assert.deepEqual(darkTableRows({data,width,height}),[]);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=20;data[i+1]=40;data[i+2]=60;}assert.deepEqual(darkTableRows({data,width,height}),[]);
 for(const y of [10,50,90,130])for(let x=20;x<=220;x++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=255;}
 for(const x of [20,80,220])for(let y=10;y<=130;y++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=255;}
 const source={data,width,height},snapshot=data.slice(),rows=darkTableRows(source);assert.equal(rows.length,3);assert.ok(tableCells(source,rows[0]));const p=tableRowPixels(source,rows[0]);assert.ok(p.width<=1648&&p.height<=2648);assert.deepEqual(data,snapshot);assert.throws(()=>tableRowPixels(source,{left:-1,top:0,width:1,height:1}));
});
test('targeted table name outranks garbled English while raw OCR and separate country text remain intact',()=>{
 const original:OcrPass={kind:'original',text:'제품명: ALA E| 500g\n원산지: 이탈리아\n반품: 풀무원식품(주)',ms:1};
 const name:OcrPass={kind:'table-row',text:'제품명 _ 스파게티 500g(SPAGHETTI 500g, 밀 100%)',ms:1,tableField:{kind:'name',label:'제품명',value:'제품명 _ 스파게티 500g(SPAGHETTI 500g, 밀 100%)'}};
 assert.equal(mergeOcrFields([original,name]).names[0].value,'스파게티 500g');assert.equal(chooseOcrText([original,name]),original.text);assert.ok(original.text.includes('ALA'));
});
test('table importer can use only a unique corroborating legal form observed in the same image',()=>{
 const table:OcrPass={kind:'table-row',text:'수입업소명\n및 소재지\n풀무원식품뚜 충북 음성군',ms:1,tableField:{kind:'importer',label:'수입업소명\n및 소재지',value:'풀무원식품뚜 충북 음성군'}};
 const original:OcrPass={kind:'original',text:'반품 및 교환장소: 풀무원식품(주) 고객센터',ms:1};assert.equal(mergeOcrFields([original,table]).importer,'풀무원식품(주)');assert.equal(mergeOcrFields([{...original,text:'다른회사(주)'},table]).importer,'풀무원식품뚜');
});
test('table-only country phrases cannot override full-image negative or conflicting evidence',()=>{
 const pass:OcrPass={kind:'table-row',text:'제조국 중국',ms:1};assert.equal(chooseOcrText([{kind:'original',text:'Not made in China',ms:1},pass]),'Not made in China');
});
test('quantity accepts explicit table separators but never guesses a digit as a unit',()=>{
 for(const sep of ['ㅣ','ᅵ','│','┃','_','|'])assert.equal(recoverQuantity([{kind:'original',text:`내용량 ${sep}500 g (1,764 kcal)`}]).value,'500g');assert.equal(recoverQuantity([{kind:'original',text:'총내용량 5008\n100g당 352kcal'}]).value,'');
});
test('observed explicit quantity is removed from the first search condition, not from the saved input',()=>{const input={...q,name:'스파게티 500g'};assert.equal(searchQueries(input)[0].name,'스파게티');assert.equal(input.name,'스파게티 500g');assert.equal(recordName({name:'비타민 B12g'}),'비타민 B12g');});
test('business suffix broadening is a traced search prefix and never erases the input company',()=>{const input={...q,importer:'가나다식품(주)'};assert.equal(importerSearchPrefix(input.importer),'가나다');assert.equal(searchQueries(input)[0].importer,'가나다');assert.equal(input.importer,'가나다식품(주)');assert.equal(importerSearchPrefix('서울식품'),'서울식품');assert.equal(importerSearchPrefix('(주)'), '');assert.ok(searchQueries({...q,importer:'(주)'}).every(q=>q.importer));});
test('combined lookup retains the same record separately for each source and each exact page',async()=>{
 const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>response(query,[record()])});assert.equal(found.result.records.length,2);assert.deepEqual(found.origins.map(o=>o.source),['current-test','legacy-test']);assert.deepEqual(found.origins.map(o=>o.query.dataset),['current','legacy']);assert.equal(found.batches?.length,2);
});
test('combined request budget is eight including all query recoveries',async()=>{
 let calls=0;const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>{calls++;return response(query,[]);}});assert.equal(calls,8);assert.equal(found.attempts.length,8);assert.ok(found.batches?.every(b=>b.total===0));
});
test('one unauthorized dataset does not erase the other and failure remains in the trace',async()=>{
 const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>{if(query.dataset==='current')throw Error('AUTH_FAILED');return response(query,[record()]);}});assert.equal(found.result.records.length,1);assert.equal(found.batches?.[0].error,'AUTH_FAILED');assert.equal(found.attempts[0].error,'AUTH_FAILED');assert.equal(found.partialError,'PARTIAL');assert.equal(found.origins[0].query.dataset,'legacy');
});
test('a failed source after a zero result is not presented as complete absence',async()=>{
 const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>{if(query.dataset==='legacy')throw Error('TIMEOUT');return response(query,[]);}});assert.equal(found.result.records.length,0);assert.equal(found.partialError,'PARTIAL');assert.equal(found.batches?.[1].error,'TIMEOUT');
});
test('quota on a later page keeps candidates and skips the second API',async()=>{
 let calls=0;const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>{calls++;if(query.page===2)throw Error('UPSTREAM_QUOTA');assert.equal(query.dataset,'current');return response(query,[record()],30);}});assert.equal(calls,2);assert.equal(found.result.records.length,1);assert.equal(found.batches?.[1].error,'SKIPPED_QUOTA');
});
test('abort between APIs prevents the second source call and publishes no result',async()=>{
 const controller=new AbortController();let calls=0;await assert.rejects(searchDatasets(q,'both',{enabled:true,signal:controller.signal,pause:async()=>controller.abort(),request:async query=>{calls++;return response(query,[record()]);}}));assert.equal(calls,1);
});
test('disabled assistance sends one query per explicitly selected dataset',async()=>{
 let calls=0;await searchDatasets(q,'both',{enabled:false,signal:new AbortController().signal,request:async query=>{calls++;return response(query,[],0);}});assert.equal(calls,2);assert.throws(()=>validateSearch({...q,dataset:'both'}));
});
test('mixed-source ranking preserves size rejection and original row indices',async()=>{
 const found=await searchDatasets(q,'both',{enabled:true,signal:new AbortController().signal,request:async query=>response(query,[query.dataset==='legacy'?record():{...record('가상 소스 150ml'),label:'내용량150ml'}])});const ranked=rankRecords(found.result.records,'가상 소스','60ml');assert.equal(ranked[0].quantity,'same');assert.equal(found.origins[ranked[0].index].query.dataset,'legacy');assert.equal(ranked[1].quantity,'different');
});
