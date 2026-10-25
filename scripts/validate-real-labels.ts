import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
import {extractProductFields} from '../validation/real-imports/baseline-productMatch';
const list=JSON.parse(await fs.readFile('validation/real-imports/manifest.json','utf8'));
const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
const results=process.argv.includes('--append')?JSON.parse(await fs.readFile('validation/real-imports/baseline-ocr.json','utf8')):[];
try{
 for(const p of list){if(results.some((r:{id:string})=>r.id===p.id))continue;
  const input=await sharp(p.file).rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const passes=[];
  for(const mode of [PSM.AUTO,PSM.SINGLE_BLOCK]){
   await worker.setParameters({tessedit_pageseg_mode:mode});const start=performance.now();const {data}=await worker.recognize(input);
   passes.push({mode,text:data.text,ms:Math.round(performance.now()-start)});
   if(mode===PSM.AUTO&&extractProductFields(data.text).names.some(n=>n.explicit))break;
  }
  const text=passes.length===2?passes[1].text+'\n'+passes[0].text:passes[0].text;
  const row={id:p.id,passes,text,fields:extractProductFields(text)};results.push(row);
  await fs.writeFile('validation/real-imports/baseline-ocr.json',JSON.stringify(results,null,2));
  console.log(p.id,JSON.stringify(row.fields));
 }
}finally{await worker.terminate();}
