import {countryCodes} from './origin';

export type IngredientKind='direct'|'possible'|'excluded'|'uncertain';
export type IngredientEvidence={line:string;kind:IngredientKind;contextInferred:boolean};
export type IngredientAnalysis={status:IngredientKind|'not-found';evidence:IngredientEvidence[]};
const marker=/(?:원\s*재\s*료(?:\s*명)?|원\s*료\s*(?:명|원산지)?|재료명|ingredients?|原材料(?:名)?|原料(?:名|産地|产地)?)/giu;
const china=/(?<![a-z])(?:china|chinese|p\.?\s*r\.?\s*c\.?)(?![a-z])|중\s*국(?:산)?|中国(?:産|产)?|中國(?:産|產)?/giu;
const boundary=/(?:제\s*조\s*국|제품\s*명|품목보고번호|식품\s*유형|(?:총\s*)?내용량|중량|영양\s*(?:정보|성분)|포장\s*재질|고객\s*상담|보관\s*방법|소비\s*기한|유통\s*기한|제조업소|제조원|제조사|제조소|수입업체|수입원|수출국|판매원|주소|브랜드|nutrition|net\s*(?:weight|contents)|storage|best\s*before|imported\s*by|distributed\s*by|manufactured\s*by|address|brand|製造国|制造国|保存方法|栄養|營養|营养|保质期)|(?:^|\n|[;|•●])\s*(?:made\s+in|product\s+of|country\s+of\s+manufacture|manufacturer)/iu;
const open='([（［',close=')]）］';
function clauseRange(text:string,index:number){
 let start=0,end=text.length,depth=0;
 for(let i=0;i<text.length;i++){
  if(open.includes(text[i]))depth++;
  else if(close.includes(text[i]))depth=Math.max(0,depth-1);
  else if(depth===0&&/[,;，；•●]/u.test(text[i])){if(i<index)start=i+1;else{end=i;break;}}
 }
 return {start,end};
}
function enclosing(text:string,index:number){
 const stack:number[]=[];
 for(let i=0;i<index;i++){if(open.includes(text[i]))stack.push(i);else if(close.includes(text[i]))stack.pop();}
 const start=stack.at(-1);if(start===undefined)return '';
 let depth=1;
 for(let i=start+1;i<text.length;i++){if(open.includes(text[i]))depth++;else if(close.includes(text[i])&&!--depth)return text.slice(start+1,i);}
 return text.slice(start+1);
}
function evidenceLine(text:string,index:number,matchLength:number){
 const start=text.lastIndexOf('\n',index-1)+1;const next=text.indexOf('\n',index+matchLength);
 return text.slice(start,next<0?text.length:next).trim();
}
export function analyzeIngredients(raw:string):IngredientAnalysis{
 const text=raw.slice(0,12000);const sections:{start:number;end:number;origin:boolean;inferred:boolean}[]=[];
 const markers=[...text.matchAll(marker)];
 for(let i=0;i<markers.length;i++){
  const m=markers[i],start=m.index!;let end=markers[i+1]?.index??text.length;
  const stop=boundary.exec(text.slice(start+m[0].length,end));if(stop)end=start+m[0].length+stop.index;
  sections.push({start,end,origin:/원산지|産地|产地/u.test(m[0]),inferred:false});
 }
 // Only a delimited OCR field heading can provide this fallback context. Raw text is never rewritten.
 for(const m of text.matchAll(/(?:^|\n)[\t ]*(?:편료명|연료명)\s*[:：|ㅣ│┃]/gu)){
  const start=m.index!+m[0].search(/\S/u);if(sections.some(s=>start>=s.start&&start<s.end))continue;
  const next=sections.filter(s=>s.start>start).sort((a,b)=>a.start-b.start)[0]?.start??text.length;
  const stop=boundary.exec(text.slice(start+m[0].trimStart().length,next));
  sections.push({start,end:stop?start+m[0].trimStart().length+stop.index:next,origin:false,inferred:true});
 }
 // "China-sourced ingredient" may put the country before the ingredient heading.
 for(const m of text.matchAll(/[^\n]*(?:중국산\s*(?:원료|원재료)|(?:china|chinese)[\s-]+(?:sourced\s+)?ingredients?|(?:中国産|中国产|中國產)\s*(?:原材料|原料))[^\n]*/giu)){
  const stop=boundary.exec(m[0]);const end=m.index!+(stop?.index??m[0].length);
  if(!sections.some(s=>m.index!>=s.start&&end<=s.end))sections.push({start:m.index!,end,origin:false,inferred:false});
 }
 const evidence:IngredientEvidence[]=[];const seen=new Set<string>();
 for(const section of sections){
  const block=text.slice(section.start,section.end);
  for(const m of block.matchAll(china)){
   if(evidence.length>=32)break;
   const index=m.index!;const range=clauseRange(block,index),clause=block.slice(range.start,range.end);
   const relative=index-range.start;const nearby=clause.slice(Math.max(0,relative-45),relative+m[0].length+55);
   if(/중국\s*(?:풍|식)|chinese[\s-]+style|中国風|中華風|中国风/iu.test(nearby))continue;
   const group=enclosing(block,index);
   const after=block.slice(index+m[0].length,Math.min(range.end,index+m[0].length+45));
   const before=block.slice(Math.max(range.start,index-45),index);
   const negative=/(?:아님|아니|미사용|불사용|불포함|미포함|사용하지|제외|없음|불명|미확인|不使用|不含|非|未使用|ではない|ではありません)/iu.test(after)||/(?:\bnot(?:\s+(?:from|of|sourced\s+from|made\s+in))?\s*|\bno\s*|非|不含|不是|不使用|未使用|비\s*)$/iu.test(before)||/^[\s-]*free\b/iu.test(after);
   const listed=countryCodes(group||nearby).length>1||/(?:등|또는|혹은|가능|후보|변경|\bor\b|may\s+be|might\s+be|varies|など|或|等|之一|可能)/iu.test(group||nearby);
   const originSyntax=section.origin||/중\s*국\s*산|中国産|中国产|中國產|中國産/iu.test(m[0])||/원산지|産地|产地|\bfrom\s*$|\borigin\s*[:：]?\s*$|\bmade\s+in\s*$/iu.test(before)||Boolean(group&&countryCodes(group).includes('CN'));
   const kind:IngredientKind=negative?'excluded':listed?'possible':originSyntax?'direct':'uncertain';
   const line=evidenceLine(text,section.start+index,m[0].length);const key=`${line}\0${kind}`;
   if(!seen.has(key)){seen.add(key);evidence.push({line,kind,contextInferred:section.inferred});}
  }
 }
 const contradictory=evidence.some(e=>e.kind==='excluded'&&evidence.some(other=>other.line===e.line&&['direct','possible'].includes(other.kind)));
 const status:IngredientAnalysis['status']=contradictory?'uncertain':evidence.some(e=>e.kind==='direct')?'direct':evidence.some(e=>e.kind==='possible')?'possible':evidence.some(e=>e.kind==='uncertain')?'uncertain':evidence.length?'excluded':'not-found';
 return {status,evidence};
}
