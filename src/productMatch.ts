import {analyzeOrigin,type Analysis} from './origin';
import type {MfdsRecord} from '../server/mfds';
import {parseQuantity,recoverQuantity,type QuantityReading} from './quantity';

export type NameCandidate={value:string;line:string;explicit:boolean;contextual?:boolean;language:'ko'|'en'};
export type ProductFields={names:NameCandidate[];importer:string;manufacturer:string;expiry:string;quantity?:string;quantityRecognition?:QuantityReading};
const fieldMarker=/(?:제품\s*명|품\s*명|식품\s*의\s*명칭|product\s*name|name\s*of\s*(?:the\s*)?product|品名|商品名|产品名称|產品名稱)\s*[:：=]?\s*/iu;
const meta=/^(?:제조|원산|원재료|원료|수입|판매|유통|소비|내용량|중량|영양|보관|주의|고객|반품|포장|식품유형|식품의유형|ingredients?|nutrition|storage|best\s*before|use\s*by|expiry|made\s*in|product\s*of|manufactur|import|distribut|packed|www\.|https?:)/iu;
function clean(value:string){return value.replace(/^[\s|ㅣᅵ│┃_:：=•·●*＊]+|[\s|ㅣᅵ│┃]+$/gu,'').replace(/\s+/gu,' ').trim().slice(0,100);}
const boundary=/(?:제품\s*명|품명|식품\s*(?:의\s*)?유형|수입\s*(?:업체명?|업소명?|판매원|원)|원\s*산\s*지|제\s*조\s*국|제조\s*(?:업소|사|원)|해외제조업소|원재료(?:명)?|소비기한|유통기한|내용량|중량|보관방법|포장재질)\s*[:：]?/giu;
export function cleanProductName(value:string){
 const joined=clean(value);const opening=joined.search(/[([（]/u);
 // Ingredient/percentage qualifiers are not needed for product-name lookup.
 return opening>=0&&/(?:%|함유|분말|코코아버터)/u.test(joined.slice(opening))?joined.slice(0,opening).trim():joined;
}
export function companySearchTerm(value:string){return clean(value.split(/\s*\/\s*|\s+(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/u)[0]).replace(/\s+/gu,'').replace(/^[{（]주[)）]/u,'(주)');}
function fieldBlocks(raw:string){
 const matches=[...raw.matchAll(boundary)];
 return matches.map((m,i)=>({marker:m[0],value:raw.slice(m.index!+m[0].length,matches[i+1]?.index??raw.length).replace(/[•●*＊|]+\s*$/u,'').trim(),line:raw.slice(m.index!,matches[i+1]?.index??raw.length).replace(/[•●*＊|]+\s*$/u,'').trim()}));
}
export function extractProductFields(raw:string):ProductFields{
 const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const names:NameCandidate[]=[];const seen=new Set<string>();
 const add=(value:string,line:string,explicit:boolean)=>{
  value=explicit?cleanProductName(value):clean(value);if(value.length<2||!/[\p{L}]/u.test(value)||meta.test(value)||/^\d[\d\s.,%gkmlℓ/-]*$/iu.test(value))return;
  const key=value.normalize('NFKC').toLocaleLowerCase();if(seen.has(key))return;seen.add(key);
  names.push({value,line,explicit,language:/[가-힣]/u.test(value)?'ko':'en'});
 };
 const blocks=fieldBlocks(raw);
 for(const b of blocks){if(fieldMarker.test(b.marker))add(b.value,b.line,true);}
 for(let i=0;!names.length&&i<lines.length;i++){
  const m=fieldMarker.exec(lines[i]);if(!m)continue;
  const tail=lines[i].slice(m.index+m[0].length).split(/(?:[|;]|\s+(?:식품\s*유형|수입업소|수입업체|수입원|제조국|원산지|내용량|제조업소)\s*[:：])/iu)[0];
  const next=tail.trim()?tail:lines[i+1]??'';add(next,lines[i]+(!tail.trim()?`\n${next}`:''),true);
 }
 // A damaged name marker can be recovered only within a Korean label field row.
 // This remains a contextual suggestion, never an identity or country proof.
 if(!names.length)for(const line of lines){
  const anchor=/원\s*산\s*지\s*[:：]?/u.exec(line);
  if(!anchor||!/제조\s*(?:업소|사)|식품\s*의\s*유형/u.test(raw.slice(raw.indexOf(line),raw.indexOf(line)+220))||/원재료|원료|함량|ingredient/iu.test(line))continue;
  const span=line.slice(0,anchor.index).trim();
  const value=span.replace(/^[^가-힣\d]*[A-Za-z|>\s]{2,12}\s+(?=[가-힣])/u,'').trim();
  if((value.match(/[가-힣]/gu)?.length??0)<6||value.length>70||meta.test(value))continue;
  add(value,line,false);if(names.length)names[names.length-1].contextual=true;
 }
 // Unlabelled headings are suggestions only; never claim a product identity from them.
 for(const line of names.length?[]:lines.slice(0,14)){if(names.length>=5)break;const letters=line.match(/\p{L}/gu)??[];const words=line.split(/\s+/).filter(Boolean);const noise=line.replace(/[\p{L}\p{N}\s.,'’&%()/-]/gu,'');if(noise.length>1||/\s{4,}/u.test(line)||words.some(w=>/^[A-Za-z]$/u.test(w))||letters.length<(/[가-힣]/u.test(line)?3:5)||line.length>80||fieldMarker.test(line)||meta.test(line)||/[:：]|\b(?:calories|protein|sugars?|serving|sodium|energy|fat|saturated|carbohydrates?|fibre|fiber|salt|kcal|kj|ingredients|contains|share\s+size)\b|[\d.%]{4,}/iu.test(line))continue;add(line,line,false);}
 const field=(marker:RegExp)=>{for(let i=0;i<lines.length;i++){const m=marker.exec(lines[i]);if(!m)continue;const value=clean(lines[i].slice(m.index+m[0].length)||lines[i+1]||'');if(value&&!meta.test(value))return value;}return '';};
 const blockValue=(re:RegExp)=>blocks.find(b=>re.test(b.marker))?.value??'';
 const importerRaw=companySearchTerm(blockValue(/수입/u)||field(/(?:수입업체(?:명)?|수입업소(?:명)?|수입판매업소|수입원|imported\s+by|importer)\s*[:：=]\s*/iu));
 const importer=importerRaw.length<=45&&!/사용|보관|유통하|제조시설|수신자|반품|교환|및/u.test(importerRaw)?importerRaw:'';
 const manufacturer=clean(blockValue(/제조(?:업소|원|사)|해외제조/u)||field(/(?:해외제조업소|제조업소|제조원|제조사|manufacturer)\s*[:：=]\s*/iu));
 const expiry=clean(blockValue(/소비기한|유통기한/u)||field(/(?:소비기한|유통기한|best\s*before|expiry)\s*[:：=]\s*/iu));
 return {names:names.slice(0,5),importer,manufacturer,expiry,quantity:clean(blockValue(/내용량|중량/u).split(/\r?\n|\(/u)[0])};
}
export function searchAlternatives(name:string,importer:string){
 const cleanName=cleanProductName(name);const tokens=cleanName.split(/\s+/u).filter(t=>/[\p{L}]/u.test(t)&&t.length>=2&&!/^[\d.%]+$/u.test(t));
 const values=[cleanName,...tokens.slice(-2).reverse(),tokens.slice(0,2).join(' ')];
 return [...new Set(values)].filter(v=>v.length>=2&&v!==name.trim()).slice(0,3).map(value=>({name:value,language:/[가-힣]/u.test(value)?'ko' as const:'en' as const,importer:companySearchTerm(importer)}));
}
export function quantityComparison(label:string,record:MfdsRecord):'same'|'different'|'missing'{
 if(/(?:g|kg|ml|l)\s*[x×*]\s*\d/iu.test(label+' '+record.name))return 'missing';
 const a=parseQuantity(label),b=parseQuantity(recordQuantity(record));return !a||!b?'missing':a.dimension!==b.dimension?'different':a.base===b.base?'same':'different';
}
export function recordQuantity(record:MfdsRecord){
 const named=parseQuantity(record.name)||parseQuantity(record.englishName);if(named)return named.value;
 return recoverQuantity([{kind:'mfds-label',text:record.label??''}]).value;
}
export type MatchBasis='agreement'|'different'|'labelOnly'|'recordOnly'|'unclear'|'unconfirmed'|'differentProduct';
export function compareIdentifier(observed:string,expected:string):'same'|'partial'|'different'|'missing'{
 const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const a=normalize(observed),b=normalize(expected);if(!a||!b)return 'missing';
 if(a===b)return 'same';return a.length>=2&&b.length>=2&&(a.includes(b)||b.includes(a))?'partial':'different';
}
export type Comparison={analysis:Analysis;label:Analysis;database:Analysis;basis:MatchBasis};
const reliable=(a:Analysis)=>!a.ambiguous&&a.countries.length===1&&(a.status==='china'||a.status==='other');
export function compareProductOrigin(labelText:string,record:MfdsRecord,identityConfirmed:boolean,quantity=''):Comparison{
 const label=analyzeOrigin(labelText);
 // Only the explicit manufacturing field may supply the database country.
 const database=record.manufacturingCountry.trim()?analyzeOrigin(`제조국: ${record.manufacturingCountry}`):analyzeOrigin('');
 const analysis:Analysis={...label,countries:[...label.countries]};
 let basis:MatchBasis='unclear';
 if(quantityComparison(quantity,record)==='different'){analysis.status='unknown';basis='differentProduct';}
 else if(!identityConfirmed){analysis.status='unknown';basis='unconfirmed';}
 else if(label.status==='conflict'||database.status==='conflict'||(reliable(label)&&reliable(database)&&label.countries[0]!==database.countries[0])){analysis.status='conflict';analysis.countries=[...new Set([...label.countries,...database.countries])];basis='different';}
 else if(label.ambiguous||database.ambiguous){analysis.status='unknown';basis='unclear';}
 else if(reliable(label)&&reliable(database)){analysis.status=label.status;basis='agreement';}
 else if(reliable(label)){analysis.status=label.status;basis='labelOnly';}
 else if(reliable(database)){analysis.status=database.status;analysis.countries=database.countries;basis='recordOnly';}
 else analysis.status='unknown';
 return {analysis,label,database,basis};
}
