import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const worker=await createWorker('eng',1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
const file='validation/labels/8801062633692.jpg';
const jobs=[
 ['full-block',sharp(file).resize({height:1800}).png(),PSM.SINGLE_BLOCK],
 ['label-bottom',sharp(file).extract({left:30,top:3200,width:2100,height:350}).resize({width:1600}).grayscale().normalize().png(),PSM.SINGLE_BLOCK],
 ['country-line',sharp(file).extract({left:30,top:3270,width:1300,height:230}).resize({width:1500}).grayscale().normalize().png(),PSM.SINGLE_LINE],
];
const results=[];
try{for(const [name,pipeline,psm] of jobs){await worker.setParameters({tessedit_pageseg_mode:psm});const image=await pipeline.toBuffer();await fs.writeFile(`validation/${name}.png`,image);const start=performance.now();const {data}=await worker.recognize(image);const r={name,text:data.text,ms:Math.round(performance.now()-start),confidence:data.confidence};results.push(r);console.log(r);}}finally{await worker.terminate();}
await fs.writeFile('validation/ocr-comparison.json',JSON.stringify(results,null,2));
