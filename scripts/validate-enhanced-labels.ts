import fs from 'node:fs/promises';import sharp from 'sharp';import {createWorker,PSM} from 'tesseract.js';
import {enhanceLabel} from '../src/labelImage.ts';import {extractProductFields} from '../src/productMatch.ts';
const root='validation/real-imports/';const rows=JSON.parse(await fs.readFile(root+'annotations.json','utf8')).filter((a:any)=>a.hasCountry&&(!process.argv.includes('--quick')||['heinz-mayo-light-1','loacker-tiramisu-1'].includes(a.id)));
const colour=process.argv.includes('--colour');
const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});const results:any[]=[];
try{for(const row of rows){
 const {data,info}=await sharp(root+row.id+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels=enhanceLabel({data:new Uint8ClampedArray(data),width:info.width,height:info.height},!colour);
 const input=await sharp(Buffer.from(pixels.data),{raw:{width:pixels.width,height:pixels.height,channels:4}}).png().toBuffer();
 for(const mode of [PSM.SINGLE_BLOCK,PSM.SINGLE_COLUMN]){
  await worker.setParameters({tessedit_pageseg_mode:mode,user_defined_dpi:'300'});const start=performance.now();const {data:ocr}=await worker.recognize(input);
  const result={id:row.id,mode,text:ocr.text,confidence:ocr.confidence,ms:Math.round(performance.now()-start),fields:extractProductFields(ocr.text)};results.push(result);
  await fs.writeFile(root+(colour?'colour-ocr.json':'enhanced-ocr.json'),JSON.stringify(results,null,2));console.log(row.id,mode,JSON.stringify(result.fields));
 }
}}finally{await worker.terminate();}
