import {enhanceLabel,type Pixels} from './labelImage';
export type TableRow={left:number;top:number;width:number;height:number};
type Band={top:number;bottom:number;left:number;right:number};
// Detect thin light rulings on a dark label. Plain/light labels keep their existing OCR path.
export function darkTableRows(source:Pixels):TableRow[]{
 const {width:w,height:h,data}=source;if(w<120||h<100||w>3200||h>3200||data.length!==w*h*4)return [];
 const light=(x:number,y:number)=>{const i=(y*w+x)*4;return .299*data[i]+.587*data[i+1]+.114*data[i+2]>195;};
 let dark=0;for(let i=0;i<data.length;i+=4)if(.299*data[i]+.587*data[i+1]+.114*data[i+2]<110)dark++;
 if(dark/(w*h)<.3)return [];
 const bands:Band[]=[];
 for(let y=0;y<h;y++){let start=0,best=0,left=0;for(let x=0;x<=w;x++){if(x<w&&light(x,y))continue;if(x-start>best){best=x-start;left=start;}start=x+1;}if(best<w*.6)continue;
  const last=bands.at(-1);if(last&&last.bottom===y-1){last.bottom=y;last.left=Math.min(last.left,left);last.right=Math.max(last.right,left+best);}else bands.push({top:y,bottom:y,left,right:left+best});
 }
 const thin=bands.filter(b=>b.bottom-b.top<=Math.max(4,h*.012));const rows:TableRow[]=[];
 if(thin.length<4)return [];
 for(let i=0;i<thin.length-1;i++){const a=thin[i],b=thin[i+1],left=Math.max(a.left,b.left)+2,right=Math.min(a.right,b.right)-2,top=a.bottom+2,bottom=b.top-1;
  if(bottom-top<12||bottom-top>h*.16||right-left<w*.55)continue;
  rows.push({left,top,width:right-left,height:bottom-top});
 }
 return rows.length>=3?rows:[];
}
export function tableRowPixels(source:Pixels,row:TableRow):Pixels{
 const {left,top,width:w,height:h}=row;if(left<0||top<0||w<1||h<1||left+w>source.width||top+h>source.height)throw Error('Invalid table row');
 const data=new Uint8ClampedArray(w*h*4).fill(255);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((top+y)*source.width+left+x)*4,gray=.299*source.data[i]+.587*source.data[i+1]+.114*source.data[i+2],v=255-Math.max(0,Math.min(255,(gray-75)*255/160));const j=(y*w+x)*4;data[j]=data[j+1]=data[j+2]=v;}
 // Remove vertical ruling strokes only when they span almost the entire row.
 for(let x=0;x<w;x++){let ink=0;for(let y=0;y<h;y++)if(data[(y*w+x)*4]<80)ink++;if(ink/h>.9)for(let y=0;y<h;y++){const j=(y*w+x)*4;data[j]=data[j+1]=data[j+2]=255;}}
 return enhanceLabel({data,width:w,height:h},false);
}
export function tableCells(source:Pixels,row:TableRow){
 for(let x=row.left+Math.round(row.width*.1);x<row.left+row.width*.4;x++){
  let light=0;for(let y=row.top;y<row.top+row.height;y++){const i=(y*source.width+x)*4;if(.299*source.data[i]+.587*source.data[i+1]+.114*source.data[i+2]>195)light++;}
  if(light/row.height<.92)continue;
  return {label:{...row,width:x-row.left-2},value:{...row,left:x+3,width:row.left+row.width-x-3}};
 }
 return undefined;
}
export type LocatedLine={text:string;bbox:{x0:number;y0:number;x1:number;y1:number}};
export function selectedTableRows(rows:TableRow[],lines:LocatedLine[]){
 const chosen:{field:'name'|'importer'|'quantity';row:TableRow;anchor:string}[]=[];
 for(const [field,pattern] of [['name',/제품\s*명|품\s*명/u],['importer',/수입\s*(?:업소|업체|원)/u],['quantity',/내\s*용\s*량/u]] as const){
  for(const line of lines){if(!pattern.test(line.text))continue;const center=(line.bbox.y0+line.bbox.y1)/2;
   const row=rows.find(r=>center>=r.top-4&&center<=r.top+r.height+4);if(row){chosen.push({field,row,anchor:line.text});break;}
  }
 }
 return chosen;
}
