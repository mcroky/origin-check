import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const root='validation/real-imports/';
const out:any[]=[];
const worker=await createWorker(['kor','eng'],1,{langPath:'public/ocr/lang',cachePath:'validation/cache'});
try{
 for(const id of ['heinz-mayo-light-1','loacker-dark-1','loacker-tiramisu-1']){
  const trimmed=await sharp(root+id+'.webp').trim({background:'#ffffff',threshold:25}).png().toBuffer();
  for(const variant of ['colour','contrast']){
   let image=sharp(trimmed).resize({width:1600,height:2600,fit:'inside'});
   if(variant==='contrast')image=image.greyscale().normalize().sharpen({sigma:0.8});
   const input=await image.extend({top:24,bottom:24,left:24,right:24,background:'white'}).png().toBuffer();
   await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
   const started=performance.now();const {data}=await worker.recognize(input,{}, {blocks:true});
   const lines=data.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines))??[];
   const anchor=lines.find(l=>/제품\s*명|원\s*산\s*지/u.test(l.text));
   const row:any={id,variant,text:data.text,ms:Math.round(performance.now()-started),anchor:anchor?{text:anchor.text,bbox:anchor.bbox}:null};
   if(anchor){
    const meta=await sharp(input).metadata();const b=anchor.bbox;
    // Include the anchor and next two lines; no product-specific coordinates.
    const height=Math.min(meta.height!-Math.max(0,b.y0-8),Math.max(45,(b.y1-b.y0)*3+24));
    const roi=await sharp(input).extract({left:Math.max(0,b.x0-12),top:Math.max(0,b.y0-8),width:Math.min(meta.width!-Math.max(0,b.x0-12),b.x1-b.x0+24),height}).extend({top:24,bottom:24,left:24,right:24,background:'white'}).png().toBuffer();
    const focused=await worker.recognize(roi);row.focused=focused.data.text;
   }
   out.push(row);await fs.writeFile(root+'recovery-experiment.json',JSON.stringify(out,null,2));console.log(id,variant,JSON.stringify({anchor:row.anchor?.text,focused:row.focused,text:row.text.slice(0,250)}));
  }
 }
}finally{await worker.terminate();}
