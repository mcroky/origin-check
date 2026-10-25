import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const cases=[
 {id:'korea',file:'validation/labels/8801062633692.jpg',crop:{left:30,top:3270,width:1300,height:230},expectedText:'PRODUCT OF KOREA',expectedCountry:'KR'},
 {id:'china',file:'validation/labels/chili-19.jpg',crop:{left:300,top:860,width:520,height:170},expectedText:'Product of China',expectedCountry:'CN'},
 {id:'conflicting-source',file:'validation/labels/5014276701115-13.jpg',crop:{left:30,top:0,width:1420,height:200},expectedText:'Product of Japan. Packed in the UK.',expectedCountry:'JP',databaseManufacturing:'china'},
];
const worker=await createWorker('eng',1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
const results=[];
try{for(const item of cases){const input=await sharp(item.file).extract(item.crop).resize({width:900,withoutEnlargement:true}).extend({top:30,bottom:30,left:30,right:30,background:'white'}).png().toBuffer();const start=performance.now();const {data}=await worker.recognize(input);results.push({...item,ms:Math.round(performance.now()-start),text:data.text,confidence:data.confidence});console.log(results.at(-1));}}finally{await worker.terminate();}
await fs.writeFile('validation/focused-results.json',JSON.stringify(results,null,2));
