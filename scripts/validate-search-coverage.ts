import fs from 'node:fs/promises';
import {assistedSearch,rankRecords} from '../src/assistedSearch.ts';
import type {SearchInput} from '../server/mfds.ts';
const root='validation/search-coverage/';
const previous=JSON.parse(await fs.readFile('validation/quantity-brands/results.json','utf8'));
const pause=()=>new Promise<void>(r=>setTimeout(r,1100));
async function request(q:SearchInput,signal:AbortSignal){
 const response=await fetch('http://127.0.0.1:5173/api/mfds/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal});
 const data=await response.json();if(!response.ok)throw Error(data.error??'FAILED');return data;
}
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
const rows=only?JSON.parse(await fs.readFile(root+'live-results.json','utf8')).rows.filter((r:any)=>r.id!==only):[];
for(const id of ['loacker-tiramisu-1','heinz-mayo-light-1','tabasco-0','lkk-0','barilla-0']){
 if(only&&id!==only)continue;
 const old=previous.find((r:any)=>r.id===id);if(!old)continue;
 const query=old.search?.attempts?.[0]?.query??{name:old.fields.names.find((n:any)=>n.explicit||n.contextual)?.value,importer:old.fields.importer,language:'ko',page:1};
 if(!query.name)continue;
 try{const trace=await assistedSearch({...query,page:1,dataset:'current'},{enabled:true,signal:AbortSignal.timeout(90000),request,pause});
 const row={id,quantity:old.fields.quantity,previousCalls:old.search?.attempts.length,previousCandidates:old.search?.result.records.length,trace,ranked:rankRecords(trace.result.records,query.name,old.fields.quantity??'')};rows.push(row);
 console.log(JSON.stringify({id,calls:trace.attempts.length,candidates:trace.result.records.length,total:trace.result.total,pages:trace.attempts.map(a=>a.query.page),compatibleQuantity:row.ranked.filter(r=>r.quantity==='same').length,bounded:trace.bounded}));
 }catch(e){rows.push({id,error:e instanceof Error?e.message:'FAILED'});console.log(id,'FAILED');}
 await fs.writeFile(root+'live-results.json',JSON.stringify({checkedAt:new Date().toISOString(),note:'Stored OCR input from v0.6. Quantity compatibility is not confirmed product identity. Bounded retrieval, not whole-database absence.',rows},null,2));await pause();
}
if(only)process.exit(0);
const probes=[];
for(const importer of ['주식회사오뚜기','오뚜기']){const query:SearchInput={name:'스콜피온',importer,language:'ko',page:1};try{const result=await request(query,AbortSignal.timeout(15000));probes.push({query,result});console.log(JSON.stringify({importer,total:result.total}));}catch(e){probes.push({query,error:e instanceof Error?e.message:'FAILED'});}await pause();}
const legacyQuery:SearchInput={name:'스콜피온',importer:'',language:'ko',page:1,dataset:'legacy'};
try{const result=await request(legacyQuery,AbortSignal.timeout(15000));probes.push({query:legacyQuery,result});}catch(e){probes.push({query:legacyQuery,error:e instanceof Error?e.message:'FAILED'});}
await fs.writeFile(root+'probes.json',JSON.stringify({checkedAt:new Date().toISOString(),probes},null,2));
