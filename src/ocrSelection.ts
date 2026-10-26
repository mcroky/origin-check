import {extractProductFields,companySearchTerm,type ProductFields,type NameCandidate} from './productMatch';
import {analyzeOrigin} from './origin';
import {recoverQuantity,type QuantityRegion} from './quantity';
import type {TableRow} from './tableImage';
export type OcrPass={kind:'original'|'colour'|'contrast'|'quantity-word'|'quantity-line'|'table-label'|'table-row';text:string;ms:number;confidence?:number;anchorValue?:string;quantityContext?:boolean;region?:QuantityRegion;tableRegion?:TableRow;tableField?:{kind:'name'|'importer'|'manufacturer';label:string;value:string}};
const normalized=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function nameQuality(n:NameCandidate){return (n.explicit?10:n.contextual?5:0)+(n.language==='ko'?2:0)-(n.language==='ko'?(n.value.match(/\b[A-Z]{2,5}\b/gu)?.length??0)*2:0);}
function tableImporter(value:string,passes:OcrPass[]){
 const term=companySearchTerm(value),core=(s:string)=>s.normalize('NFKC').replace(/\(주\)|주식회사|\s/gu,'');
 const candidates=[...passes.filter(p=>!p.kind.startsWith('quantity')&&!p.kind.startsWith('table')).flatMap(p=>[...p.text.normalize('NFKC').matchAll(/([가-힣A-Za-z0-9.&]+\s*\(주\))/gu)].map(m=>m[1]))];
 const found=[...new Set(candidates.filter(c=>core(c).length>=4&&core(term).startsWith(core(c))&&core(term).length-core(c).length<=2))];
 return found.length===1?companySearchTerm(found[0]):term;
}
export function mergeOcrFields(passes:OcrPass[]):ProductFields{
 const table=passes.filter(p=>p.tableField).map(p=>{const f=extractProductFields(p.text),t=p.tableField!;if(t.kind==='importer'&&/수입\s*(?:업소|업체|원)/u.test(t.label))f.importer=tableImporter(t.value,passes);if(t.kind==='manufacturer'&&/제조사|제조업소/u.test(t.label))f.manufacturer=t.value.trim();return f;});
 const fields=[...table,...passes.filter(p=>!p.kind.startsWith('quantity')&&!p.kind.startsWith('table')).map(p=>extractProductFields(p.text))];const names:NameCandidate[]=[];const seen=new Set<string>();
 for(const n of fields.flatMap(f=>f.names).sort((a,b)=>nameQuality(b)-nameQuality(a))){const key=normalized(n.value);if(!seen.has(key)){seen.add(key);names.push(n);}}
 const first=(key:'importer'|'manufacturer'|'expiry'|'quantity')=>fields.find(f=>f[key])?.[key]??'';
 const quantityRecognition=recoverQuantity(passes.filter(p=>!p.kind.startsWith('table')));const quantity=quantityRecognition.status==='conflict'?'':quantityRecognition.value||first('quantity')||quantityRecognition.observed;
 const reliable=names.filter(n=>n.explicit||n.contextual);const candidates=reliable.length?reliable:names;
 return {names:candidates.filter(n=>!candidates.some(other=>other!==n&&normalized(other.value).length>normalized(n.value).length&&normalized(other.value).includes(normalized(n.value)))).slice(0,5),importer:first('importer'),manufacturer:first('manufacturer'),expiry:first('expiry'),quantity,quantityRecognition};
}
export function chooseOcrText(passes:OcrPass[]){
 passes=passes.filter(p=>!p.kind.startsWith('quantity')&&!p.kind.startsWith('table'));
 if(!passes.length)return '';
 const origins=passes.map(p=>analyzeOrigin(p.text));
 if(passes.some(p=>/(?:not|never|no\s+longer)\s+(?:made|manufactured|produced)|중국산?\s*(?:아님|아니)|可能|may\s+be|might\s+be|不是中国|非中国/iu.test(p.text)))return passes.map(p=>p.text).join('\n');
 const reliable=origins.filter(a=>!a.ambiguous&&a.countries.length===1&&a.status!=='unknown');
 if(new Set(reliable.flatMap(a=>a.countries)).size>1)return passes.map(p=>p.text).join('\n');
 const score=(pass:OcrPass,i:number)=>{const f=extractProductFields(pass.text),a=origins[i];return (!a.ambiguous&&a.countries.length===1&&a.status!=='unknown'?8:0)+(f.names.some(n=>n.explicit)?6:f.names.some(n=>n.contextual)?3:0)+(f.importer?2:0)+(f.manufacturer?1:0);};
 const confidence=(pass:OcrPass)=>Number.isFinite(pass.confidence)?Math.max(0,Math.min(100,pass.confidence!)):-1;
 // Confidence only breaks equal extraction scores; country conflicts and negatives above still require review.
 return passes.map((p,i)=>({p,score:score(p,i)})).sort((a,b)=>b.score-a.score||confidence(b.p)-confidence(a.p))[0].p.text;
}
