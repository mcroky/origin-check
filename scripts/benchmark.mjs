import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const manifest=JSON.parse(await fs.readFile('validation/benchmark-manifest.json','utf8'));
const results=[];
const workers={};
try{for(const item of manifest){
 const worker=workers[item.language]||=await createWorker(item.language.split('+'),1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
 await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
 const input=await sharp(item.file).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 const start=performance.now();const {data}=await worker.recognize(input);
 results.push({...item,text:data.text,confidence:data.confidence,ms:Math.round(performance.now()-start)});
 await fs.writeFile('validation/benchmark-results.json',JSON.stringify(results,null,2));
 console.log(item.code,results.at(-1).ms,'ms',data.text.length,'characters');
}}finally{await Promise.all(Object.values(workers).map(w=>w.terminate()));}
