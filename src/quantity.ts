export type QuantityPass={kind:string;text:string;anchorValue?:string;quantityContext?:boolean};
export type QuantityEvidence={pass:string;raw:string;value:string;unit:string;method:'literal'|'alias'|'ambiguous'|'context'};
export type QuantityReading={status:'recognized'|'corrected'|'uncertain'|'conflict'|'missing';value:string;observed:string;suggestions:string[];evidence:QuantityEvidence[]};
const marker=/(?:총\s*)?내\s*용\s*량|중\s*량|net\s*(?:wt\.?|weight|contents?|volume)/giu;
const number=String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
export function parseQuantity(text:string){
 const s=text.normalize('NFKC').replace(/밀리리터|밀리리트르/gu,'ml').replace(/킬로그램/gu,'kg').replace(/그램/gu,'g').replace(/리터|ℓ/gu,'l');
 const m=new RegExp(`(${number})\\s*(kg|g|ml|l)(?![a-z가-힣])`,'iu').exec(s);
 if(!m)return null;const amount=Number(m[1].replaceAll(',','')),unit=m[2].toLowerCase();
 if(!Number.isFinite(amount)||amount<=0)return null;
 return {amount,unit,value:`${amount}${unit}`,base:amount*(unit==='kg'||unit==='l'?1000:1),dimension:unit==='g'||unit==='kg'?'mass':'volume'};
}
export function quantityFragments(text:string){
 const fragments:string[]=[];
 for(const match of text.matchAll(marker)){
  let tail=text.slice(match.index!+match[0].length).replace(/^[\s:：|ㅣᅵ│┃_]+/u,'');
  // Tables can place a unit on the following line. Never consume another field.
  if(/^(?:원재료|원산지|제조|수입|소비|유통|영양)/u.test(tail))continue;
  const line=tail.split(/\r?\n/u).slice(0,2).join(' ').split(/\||원재료|소비기한|제조사|수입원/u)[0].trim();
  if(/^\d/u.test(line))fragments.push(line.slice(0,65));
 }
 return fragments;
}
export function recoverQuantity(passes:QuantityPass[]):QuantityReading{
 const evidence:QuantityEvidence[]=[];let observed='';
 for(const pass of passes){
  const fragments=pass.quantityContext?[pass.text.trim()]:quantityFragments(pass.text);let context=false;
  if(!fragments.length&&!pass.quantityContext){
   const energy=new RegExp(`(${number}\\s*(?:kg|g|ml|l))\\s*(?:\\r?\\n[^\\d\\n]{0,12})?\\s*\\(\\s*\\d[\\d,.]*\\s*kcal`,'giu');
   for(const m of pass.text.matchAll(energy)){if(!/1회|serving|per\s*100|당/iu.test(pass.text.slice(Math.max(0,m.index!-18),m.index!)))fragments.push(m[1]);}context=fragments.length>0;
  }
  // A damaged field marker can be corroborated by repeated amount+unit beside energy.
  if(!fragments.length&&/\d+\s*m[il1]\s*\([^)]*(?:cal|칼로리)/iu.test(pass.text)){
   const m=/\d+\s*m[il1]\s*\([^\n]*/iu.exec(pass.text);if(m)fragments.push(m[0]);
  }
  for(const raw of fragments){
   const s=raw.normalize('NFKC').replace(/^[\s|:]+/u,'');if(!observed)observed=raw;
   // Multipacks need explicit review; never silently discard a count.
   if(/\d\s*(?:g|kg|ml|l)\s*[x×*]|[x×*]\s*\d/iu.test(s))continue;
   const literal=parseQuantity(s);
   const leading=new RegExp(`^(${number})`,'u').exec(s);
   if(literal&&leading&&Number(leading[1].replaceAll(',',''))===literal.amount&&(!pass.anchorValue||literal.amount===Number(pass.anchorValue.replaceAll(',','')))){
    evidence.push({pass:pass.kind,raw,value:String(literal.amount),unit:literal.unit,method:context?'context':'literal'});continue;
   }
   const alias=new RegExp(`^(${number})\\s*(mi|m1|mI|m\\|)(?![a-z])`,'iu').exec(s);
   if(alias&&(!pass.anchorValue||Number(alias[1])===Number(pass.anchorValue)))evidence.push({pass:pass.kind,raw,value:alias[1].replaceAll(',',''),unit:'ml',method:'alias'});
   else {const ambiguous=new RegExp(`^(${number})\\s+([09o])(?:\\s|$)`,'iu').exec(s);if(ambiguous)evidence.push({pass:pass.kind,raw,value:ambiguous[1].replaceAll(',',''),unit:'g',method:'ambiguous'});}
  }
 }
 const clear=evidence.filter(e=>e.method==='literal'||e.method==='context'&&new Set(evidence.filter(x=>x.method==='context'&&x.value===e.value&&x.unit===e.unit).map(x=>x.pass)).size>=2);
 const keys=new Set(clear.map(e=>{const q=parseQuantity(e.value+e.unit)!;return `${q.dimension}:${q.base}`;}));
 if(keys.size>1)return {status:'conflict',value:'',observed,suggestions:[...new Set(clear.map(e=>e.value+e.unit))],evidence};
 if(clear.length&&evidence.some(e=>Number(e.value)!==Number(clear[0].value)&&e.unit===clear[0].unit))return {status:'conflict',value:'',observed,suggestions:[...new Set(evidence.map(e=>e.value+e.unit))],evidence};
 if(clear.length){const e=clear[0],value=e.value+e.unit;return {status:evidence.some(x=>x.method!=='literal')||e.pass.startsWith('quantity')?'corrected':'recognized',value,observed,suggestions:[],evidence};}
 const aliases=evidence.filter(e=>e.method==='alias');
 const corroborated=aliases.find(e=>new Set(aliases.filter(a=>a.value===e.value).map(a=>a.pass)).size>=2);
 if(corroborated&&new Set(aliases.map(e=>e.value)).size===1)return {status:'corrected',value:corroborated.value+'ml',observed,suggestions:[],evidence};
 const suggestions=[...new Set(evidence.map(e=>e.value+e.unit))];
 return {status:observed?'uncertain':'missing',value:'',observed,suggestions,evidence};
}
type Box={x0:number;y0:number;x1:number;y1:number};
type Line={text:string;bbox:Box;words:{text:string;bbox:Box}[]};
export type QuantityRegion={left:number;top:number;width:number;height:number;anchorValue:string;sourceLine:string};
export function quantityRegions(lines:Line[],width:number,height:number):QuantityRegion[]{
 const out:QuantityRegion[]=[];
 for(const line of lines){
  if(/100\s*(?:g|ml|m[i1])\s*(?:당|per)|나트륨|탄수화물|단백질/iu.test(line.text))continue;
  const match=new RegExp(`(?:총\\s*)?내\\s*용\\s*량\\s*[:：]?\\s*(${number})`,'iu').exec(line.text)??new RegExp(`(${number})\\s*m[li1]\\s*\\([^)]*(?:cal|칼로리)`,'iu').exec(line.text);
  if(!match)continue;const value=match[1],at=line.words.findIndex(w=>w.text.includes(value));if(at<0)continue;
  const words=[line.words[at]];const next=line.words[at+1];if(next&&/^[09og]|^m[li1]|^[kmgℓl]+$/iu.test(next.text))words.push(next);
  const left=Math.max(0,Math.min(...words.map(w=>w.bbox.x0))-8),top=Math.max(0,Math.min(...words.map(w=>w.bbox.y0))-8);
  const right=Math.min(width,Math.max(...words.map(w=>w.bbox.x1))+8),bottom=Math.min(height,Math.max(...words.map(w=>w.bbox.y1))+8);
  if(right<=left||bottom<=top)continue;
  out.push({left,top,width:right-left,height:bottom-top,anchorValue:value,sourceLine:line.text});if(out.length===2)break;
 }
 return out;
}
export function quantityPixels(source:{data:Uint8ClampedArray;width:number;height:number},region:QuantityRegion){
 const scale=Math.min(4,120/region.height,1600/region.width),w=Math.max(1,Math.round(region.width*scale)),h=Math.max(1,Math.round(region.height*scale)),pad=20;
 const width=w+2*pad,height=h+2*pad,data=new Uint8ClampedArray(width*height*4).fill(255);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=Math.min(source.width-1,region.left+(x+.5)/scale-.5),sy=Math.min(source.height-1,region.top+(y+.5)/scale-.5),x0=Math.max(0,Math.floor(sx)),y0=Math.max(0,Math.floor(sy)),x1=Math.min(source.width-1,x0+1),y1=Math.min(source.height-1,y0+1),dx=sx-x0,dy=sy-y0;
  for(let c=0;c<3;c++){const get=(xx:number,yy:number)=>source.data[(yy*source.width+xx)*4+c];data[((y+pad)*width+x+pad)*4+c]=get(x0,y0)*(1-dx)*(1-dy)+get(x1,y0)*dx*(1-dy)+get(x0,y1)*(1-dx)*dy+get(x1,y1)*dx*dy;}
 }
 return {data,width,height};
}
