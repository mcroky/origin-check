import fs from 'node:fs/promises';
import {createWorker,PSM} from 'tesseract.js';
import sharp from 'sharp';
const manifest=JSON.parse(await fs.readFile('validation/label-manifest.json','utf8'));
await fs.mkdir('validation/cache',{recursive:true});
const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
const results=[];
try{
 for(const item of manifest){
  const start=performance.now();
  const input=await sharp(item.file).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const {data}=await worker.recognize(input);
  const row={code:item.code,text:data.text,ocrConfidence:data.confidence,ms:Math.round(performance.now()-start)};
  results.push(row);console.log(JSON.stringify(row));
  await fs.writeFile('validation/ocr-results.json',JSON.stringify(results,null,2));
 }
}finally{await worker.terminate();}
