import fs from 'node:fs/promises';import sharp from 'sharp';import {createWorker,PSM} from 'tesseract.js';
import {enhanceLabel} from '../src/labelImage.ts';import {chooseOcrText,mergeOcrFields,type OcrPass} from '../src/ocrSelection.ts';
import {assistedSearch,rankRecords,recordName} from '../src/assistedSearch.ts';import {compareIdentifier,quantityComparison} from '../src/productMatch.ts';import {analyzeOrigin} from '../src/origin.ts';
const target='validation/ocr-improvement/';await fs.mkdir(target,{recursive:true});
const annotations=JSON.parse(await fs.readFile('validation/real-imports/annotations.json','utf8'));
const reuse=process.argv.includes('--reuse');const previous=reuse?JSON.parse(await fs.readFile(target+'results.json','utf8')):[];
const worker=reuse?undefined:await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});const rows:any[]=[];
try{for(const gold of annotations){
 const start=performance.now(),passes:OcrPass[]=[];
 if(reuse)passes.push(...previous.find((r:any)=>r.id===gold.id).passes);else {
 const source=await sharp(`validation/real-imports/${gold.id}.webp`).rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const kind of ['original','colour','contrast'] as const){
  const pixels=kind==='original'?{data:new Uint8ClampedArray(source.data),width:source.info.width,height:source.info.height}:enhanceLabel({data:new Uint8ClampedArray(source.data),width:source.info.width,height:source.info.height},kind==='contrast');
  const input=await sharp(Buffer.from(pixels.data),{raw:{width:pixels.width,height:pixels.height,channels:4}}).png().toBuffer();
  await worker!.setParameters({tessedit_pageseg_mode:kind==='original'?PSM.AUTO:kind==='colour'?PSM.SINGLE_BLOCK:PSM.SINGLE_COLUMN,user_defined_dpi:'300'});
  const time=performance.now();const {data}=await worker!.recognize(input);passes.push({kind,text:data.text,ms:Math.round(performance.now()-time)});
 }
 }
 const text=chooseOcrText(passes),fields=mergeOcrFields(passes),country=analyzeOrigin(text);
 const row:any={id:gold.id,kind:gold.kind,passes,text,fields,country,elapsedMs:reuse?previous.find((r:any)=>r.id===gold.id).elapsedMs:Math.round(performance.now()-start)};
 const candidate=fields.names.find(n=>n.explicit||n.contextual);
 if(reuse&&candidate)row.search=previous.find((r:any)=>r.id===gold.id).search;
 if(!reuse&&process.argv.includes('--search')&&candidate){
  try{row.search=await assistedSearch({name:candidate.value,language:candidate.language,importer:fields.importer,page:1},{enabled:true,signal:AbortSignal.timeout(45000),pause:()=>new Promise(r=>setTimeout(r,1100)),request:async(q,signal)=>{const r=await fetch('http://127.0.0.1:5173/api/mfds/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal});const data=await r.json();if(!r.ok)throw Error(data.error??'FAILED');return data;}});
   row.ranked=rankRecords(row.search.result.records,candidate.value,fields.quantity??'').map(r=>({...r,spelling:recordName(r.record)}));
  }catch(e){row.searchError=e instanceof Error?e.message:'FAILED';}
 }
 if(row.search&&candidate)row.ranked=rankRecords(row.search.result.records,candidate.value,fields.quantity??'').map(r=>({...r,spelling:recordName(r.record)}));
 row.metrics={nameExact:fields.names.filter(n=>n.explicit||n.contextual).some(n=>compareIdentifier(n.value,gold.name)==='same'),countryCorrect:Boolean(gold.country&&!country.ambiguous&&country.status!=='unknown'&&country.countries.length===1&&country.countries[0]===gold.country),compatibleCandidate:Boolean(row.ranked?.some((r:any)=>compareIdentifier(recordName(r.record),gold.name)==='same'&&quantityComparison(gold.quantity??'',r.record)==='same'&&r.record.manufacturingCountry===gold.countryText&&compareIdentifier(r.record.importer,gold.importer??'')==='same'&&compareIdentifier(r.record.manufacturer,gold.manufacturer??'')==='same'))};
 rows.push(row);await fs.writeFile(target+'results.json',JSON.stringify(rows,null,2));console.log(row.id,JSON.stringify({name:candidate?.value,country:country.status,queries:row.search?.attempts.map((a:any)=>a.query.name),total:row.search?.result.total,...row.metrics,ms:row.elapsedMs}));
}}
finally{await worker?.terminate();}
const labels=rows.filter(r=>annotations.find((g:any)=>g.id===r.id).hasCountry),controls=rows.filter(r=>!annotations.find((g:any)=>g.id===r.id).hasCountry);
const median=(items:any[])=>{const values=items.map(r=>r.elapsedMs).sort((a,b)=>a-b);return values.length?(values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2:0;};
const summary={checkedAt:new Date().toISOString(),images:rows.length,labels:labels.length,controls:controls.length,nameExact:labels.filter(r=>r.metrics.nameExact).length,countryCorrect:labels.filter(r=>r.metrics.countryCorrect).length,compatibleCandidate:labels.filter(r=>r.metrics.compatibleCandidate).length,controlAutoSeeds:controls.filter(r=>r.fields.names.some((n:any)=>n.explicit||n.contextual)).length,medianElapsedMs:median(rows),labelMedianElapsedMs:median(labels),note:'Same convenience sample used for development; not an independent accuracy estimate. Candidate compatibility uses manually transcribed gold quantities; no automatic identity or lot confirmation.'};
await fs.writeFile(target+'summary.json',JSON.stringify(summary,null,2));console.log(summary);
