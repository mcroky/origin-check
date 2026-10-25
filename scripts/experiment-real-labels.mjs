import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const files=['loacker-dark-1','heinz-mayo-light-1'];
const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});const results=[];
try{for(const id of files){
 const original=sharp(`validation/real-imports/${id}.webp`);
 const trimmed=await original.clone().trim({background:'#ffffff',threshold:25}).resize({width:2000,height:3200,fit:'inside'}).withMetadata({density:300}).png().toBuffer();
 await fs.writeFile(`validation/real-imports/${id}-trim.png`,trimmed);
 for(const mode of [PSM.AUTO,PSM.SINGLE_BLOCK,PSM.SPARSE_TEXT]){await worker.setParameters({tessedit_pageseg_mode:mode,user_defined_dpi:'300'});const {data}=await worker.recognize(trimmed);results.push({id,mode,text:data.text});console.log(id,mode,data.text.slice(0,750));await fs.writeFile('validation/real-imports/preprocess-experiment.json',JSON.stringify(results,null,2));}
}}finally{await worker.terminate();}
