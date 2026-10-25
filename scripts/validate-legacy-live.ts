import fs from 'node:fs/promises';
import {assistedSearch,rankRecords} from '../src/assistedSearch.ts';
import {recordQuantity} from '../src/productMatch.ts';
import type {SearchInput} from '../server/mfds.ts';
const root='validation/search-coverage/';
const stored=JSON.parse(await fs.readFile('validation/quantity-brands/results.json','utf8'));
const rows:any[]=[];const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,1100));
const save=()=>fs.writeFile(root+'legacy-live-results.json',JSON.stringify({checkedAt:new Date().toISOString(),note:'Stored OCR inputs, no new photo OCR. Manual reference queries are separate from observed-OCR searches. Historical declaration candidates do not verify a purchased batch.',rows},null,2));
const request=async(query:SearchInput,signal:AbortSignal)=>{const response=await fetch('http://127.0.0.1:5173/api/mfds/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query),signal});const data=await response.json();if(!response.ok)throw Error(data.error??'FAILED');return data;};
for(const id of ['tabasco-0','lkk-0','barilla-0']){
 const previous=stored.find((r:any)=>r.id===id),observed=previous.search.attempts[0].query;
 const reference=id==='tabasco-0'?{name:'스콜피온',importer:'오뚜기'}:id==='lkk-0'?{name:'팬더',importer:'오뚜기'}:{name:'스파게티',importer:'풀무원'};
 for(const mode of ['observed-ocr','manual-reference'] as const){
  const query:SearchInput={...observed,...(mode==='manual-reference'?reference:{}),page:1,dataset:'legacy'};
  const row:any={id,mode,query,photoQuantity:previous.fields.quantity};
  try{row.trace=await assistedSearch(query,{enabled:true,signal:AbortSignal.timeout(90000),pause,request});row.ranked=rankRecords(row.trace.result.records,observed.name,previous.fields.quantity??'');row.summary={calls:row.trace.attempts.length,total:row.trace.result.total,candidates:row.trace.result.records.length,bounded:row.trace.bounded,partialError:row.trace.partialError,quantityCompatible:row.ranked.filter((r:any)=>r.quantity==='same').map((r:any)=>({name:r.record.name,importer:r.record.importer,manufacturer:r.record.manufacturer,country:r.record.manufacturingCountry,quantity:recordQuantity(r.record),processedAt:r.record.processedAt,origin:row.trace.origins[r.index]}))};}
  catch(error){row.error=error instanceof Error?error.message:'FAILED';}
  rows.push(row);await save();console.log(JSON.stringify({id,mode,error:row.error,...row.summary}));await pause();
 }
}
