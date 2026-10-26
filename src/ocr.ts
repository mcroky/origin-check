import {createWorker,PSM,type Worker} from 'tesseract.js';
import {enhanceLabel} from './labelImage';
import {chooseOcrText,type OcrPass} from './ocrSelection';
import {quantityRegions,quantityPixels,type QuantityRegion} from './quantity';
import {darkTableRows,tableCells,tableRowPixels} from './tableImage';
export type OcrReading={text:string;passes:OcrPass[];enhancementFailed?:boolean};
export type LabelLanguage='kor'|'eng'|'chi_sim'|'jpn';
export type Crop={x:number;y:number;w:number;h:number};
export async function imageData(file:Blob){
 return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});
}
export async function transformImage(src:string,rotation=0,crop?:Crop):Promise<string>{
 const img=new Image();img.src=src;await img.decode();
 if(img.width*img.height>40_000_000)throw new Error('Image too large');
 const canvas=document.createElement('canvas');const swap=rotation%180!==0;
 const scale=Math.min(1,3200/Math.max(img.width,img.height));
 canvas.width=Math.round((swap?img.height:img.width)*scale);canvas.height=Math.round((swap?img.width:img.height)*scale);
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height*scale);
 if(!crop)return canvas.toDataURL('image/png');
 const selected=document.createElement('canvas');const ratio=Math.min(1,900/(canvas.width*crop.w));const w=Math.max(1,Math.round(canvas.width*crop.w*ratio)),h=Math.max(1,Math.round(canvas.height*crop.h*ratio));selected.width=w+60;selected.height=h+60;
 const selectedContext=selected.getContext('2d')!;selectedContext.fillStyle='white';selectedContext.fillRect(0,0,selected.width,selected.height);selectedContext.drawImage(canvas,canvas.width*crop.x,canvas.height*crop.y,canvas.width*crop.w,canvas.height*crop.h,30,30,w,h);
 return selected.toDataURL('image/png');
}
async function enhancedImage(src:string,contrast:boolean){
 const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
 const pixels=enhanceLabel(context.getImageData(0,0,image.width,image.height),contrast);return {url:pixelImage(pixels),pixels};
}
function pixelImage(pixels:{data:Uint8ClampedArray;width:number;height:number}){const canvas=document.createElement('canvas');canvas.width=pixels.width;canvas.height=pixels.height;canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height),0,0);return canvas.toDataURL('image/png');}
export function createOcrJob(src:string,lang:LabelLanguage,progress:(n:number)=>void,blockLayout=false,enhance=lang==='kor'){
 let worker:Worker|undefined;let cancelled=false;let phase=0;let steps=enhance?15:1;let timeout:ReturnType<typeof setTimeout>;
 const stop=()=>{cancelled=true;void worker?.terminate();};
 const task=(async()=>{
  worker=await createWorker(lang==='eng'?'eng':[lang,'eng'],1,{
   workerPath:new URL(`${import.meta.env.BASE_URL}ocr/worker.min.js`,location.href).href,
   corePath:new URL(`${import.meta.env.BASE_URL}ocr/core/`,location.href).href,
   langPath:new URL(`${import.meta.env.BASE_URL}ocr/lang/`,location.href).href,
   logger:m=>{if(!cancelled&&m.status==='recognizing text')progress((phase+m.progress)/steps);},
  });
  if(cancelled){await worker.terminate();throw new Error('cancelled');}
  const passes:OcrPass[]=[];
  const recognize=async(input:string,kind:OcrPass['kind'],mode:PSM,region?:QuantityRegion)=>{if(cancelled)throw Error('cancelled');phase=passes.length;await worker!.setParameters({tessedit_pageseg_mode:mode,user_defined_dpi:'300'});const start=performance.now();const {data}=await worker!.recognize(input,{}, {blocks:kind==='colour'});passes.push({kind,text:data.text,ms:Math.round(performance.now()-start),confidence:data.confidence,...(region?{region,anchorValue:region.anchorValue,quantityContext:true}:{})});return data;};
  await recognize(src,'original',blockLayout?PSM.SINGLE_BLOCK:PSM.AUTO);
  let enhancementFailed=false;
  if(enhance)try{
   const colour=await enhancedImage(src,false);const page=await recognize(colour.url,'colour',PSM.SINGLE_BLOCK);
   const regions=quantityRegions(page.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines))??[],colour.pixels.width,colour.pixels.height);
   await recognize((await enhancedImage(src,true)).url,'contrast',PSM.SINGLE_COLUMN);
   const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const cx=c.getContext('2d')!;cx.drawImage(image,0,0);const source=cx.getImageData(0,0,c.width,c.height);
   const rows=darkTableRows(source).slice(0,4);steps=3+rows.length*2+regions.length*2;
   for(const row of rows){const cells=tableCells(source,row);if(!cells)continue;const labelData=await recognize(pixelImage(tableRowPixels(source,cells.label)),'table-label',PSM.SINGLE_BLOCK);passes.at(-1)!.tableRegion=cells.label;
    const label=labelData.text,kind=/제품\s*명|품\s*명/u.test(label)?'name':/수입\s*(?:업소|업체|원)/u.test(label)?'importer':/제조사|제조업소/u.test(label)?'manufacturer':undefined;if(!kind)continue;
    const region=kind==='name'?row:cells.value;const value=await recognize(pixelImage(tableRowPixels(source,region)),'table-row',PSM.SINGLE_BLOCK);const pass=passes.at(-1)!;pass.tableRegion=region;pass.tableField={kind,label,value:value.text};if(kind!=='name')pass.text=label+'\n'+value.text;
   }
   if(regions.length){await worker.reinitialize('eng');for(const region of regions){const url=pixelImage(quantityPixels(colour.pixels,region));await recognize(url,'quantity-word',PSM.SINGLE_WORD,region);await recognize(url,'quantity-line',PSM.SINGLE_LINE,region);}}
  }catch(error){if(cancelled)throw error;enhancementFailed=true;}
  progress(1);
  return {text:chooseOcrText(passes),passes,enhancementFailed} satisfies OcrReading;
 })();
 const deadline=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{stop();reject(new Error('timeout'));},90_000);});
 const promise=Promise.race([task,deadline]).finally(()=>{clearTimeout(timeout);void worker?.terminate();});
 return {promise,cancel:stop};
}
