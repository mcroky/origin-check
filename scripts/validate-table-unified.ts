import fs from 'node:fs/promises';import sharp from 'sharp';import {createWorker,PSM} from 'tesseract.js';
import {darkTableRows,tableCells,tableRowPixels} from '../src/tableImage.ts';
import {mergeOcrFields,chooseOcrText,type OcrPass} from '../src/ocrSelection.ts';import {recordName,searchDatasets,rankRecords} from '../src/assistedSearch.ts';
const root='validation/table-unified/';const previous=JSON.parse(await fs.readFile('validation/quantity-brands/results.json','utf8'));
const fresh=JSON.parse(await fs.readFile('validation/quantity-brands/annotations.json','utf8'));
const rows:any[]=[];const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
try{for(const old of previous){
 const file=fresh.find((r:any)=>r.id===old.id)?.file??`validation/real-imports/${old.id}.webp`;
 const raw=await sharp(file).rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});const source={data:new Uint8ClampedArray(raw.data),width:raw.info.width,height:raw.info.height};
 const passes:OcrPass[]=[...old.passes];const began=performance.now();const regions=darkTableRows(source).slice(0,4);
 const read=async(region:any,kind:OcrPass['kind'])=>{const p=tableRowPixels(source,region);const image=await sharp(Buffer.from(p.data),{raw:{width:p.width,height:p.height,channels:4}}).png().toBuffer();await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,user_defined_dpi:'300'});const start=performance.now(),{data}=await worker.recognize(image);const pass:OcrPass={kind,text:data.text,ms:Math.round(performance.now()-start),tableRegion:region};passes.push(pass);return pass;};
 for(const row of regions){const cells=tableCells(source,row);if(!cells)continue;const label=await read(cells.label,'table-label'),kind=/제품\s*명|품\s*명/u.test(label.text)?'name':/수입\s*(?:업소|업체|원)/u.test(label.text)?'importer':/제조사|제조업소/u.test(label.text)?'manufacturer':undefined;if(!kind)continue;const value=await read(kind==='name'?row:cells.value,'table-row');value.tableField={kind,label:label.text,value:value.text};if(kind!=='name')value.text=label.text+'\n'+value.text;}
 const fields=mergeOcrFields(passes),text=chooseOcrText(passes);const row:any={id:old.id,baseline:old.fields,fields,passes,tableRows:regions.length,extraMs:Math.round(performance.now()-began),countryText:text};
 rows.push(row);await fs.writeFile(root+'results.json',JSON.stringify({checkedAt:new Date().toISOString(),method:'Frozen v0.6 basic/quantity OCR plus new table-region OCR and new field parser, same source images. Not 20 phone photos.',rows},null,2));console.log(JSON.stringify({id:old.id,tableRows:regions.length,name:fields.names[0]?.value,importer:fields.importer,quantity:fields.quantity,status:fields.quantityRecognition?.status}));
}}
finally{await worker.terminate();}
if(process.argv.includes('--search')){
 const pause=()=>new Promise<void>(r=>setTimeout(r,1100));
 for(const id of ['barilla-0','tabasco-0']){const row=rows.find(r=>r.id===id),seed=row.fields.names.find((n:any)=>n.explicit||n.contextual)??row.fields.names[0];if(!seed)continue;
  try{row.search=await searchDatasets({name:seed.value,language:seed.language,importer:row.fields.importer,page:1},'both',{enabled:true,signal:AbortSignal.timeout(130000),pause,request:async(query,signal)=>{const response=await fetch('http://127.0.0.1:5173/api/mfds/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query),signal});const result=await response.json();if(!response.ok)throw Error(result.error??'FAILED');return result;}});row.ranked=rankRecords(row.search.result.records,seed.value,row.fields.quantity??'');console.log(JSON.stringify({id,batches:row.search.batches,calls:row.search.attempts.length,compatible:row.ranked.filter((r:any)=>r.quantity==='same').length}));}catch(error){row.searchError=error instanceof Error?error.message:'FAILED';}await pause();
 }
 await fs.writeFile(root+'results.json',JSON.stringify({checkedAt:new Date().toISOString(),method:'Frozen OCR inputs plus new table OCR; live dual-dataset query. Candidate selection is manual.',rows},null,2));
}
