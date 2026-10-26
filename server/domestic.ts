import {ApiError} from './mfds';
import {validGtin} from '../src/origin';
import type {DomesticIdentity,DomesticIngredient,DomesticLookup,DomesticDetail} from '../src/officialTypes';
export const BARCODE_SOURCE='https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C005';
export const INGREDIENT_SOURCE='https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C002';
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=12000)=>typeof v==='string'?v.slice(0,max):typeof v==='number'?String(v):'';
export function validateBarcode(value:unknown){if(typeof value!=='string')throw new ApiError('INVALID_BARCODE',400);const code=value.normalize('NFKC').replace(/[\s-]/gu,'');if(!validGtin(code))throw new ApiError('INVALID_BARCODE',400);return code;}
export const sameBarcode=(a:string,b:string)=>validGtin(a)&&validGtin(b)&&a.padStart(14,'0')===b.padStart(14,'0');
export function foodSafetyUrl(key:string,service:'C005'|'C002',value:string){
 if(!key.trim())throw new ApiError('FOODSAFETY_NOT_CONFIGURED',503);
 const query=service==='C005'?`BAR_CD=${encodeURIComponent(validateBarcode(value))}`:`PRDLST_REPORT_NO=${encodeURIComponent(value)}`;
 if(service==='C002'&&!/^\d{6,30}$/u.test(value))throw new ApiError('INVALID_REPORT',400);
 return `https://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(key.trim())}/${service}/json/1/${service==='C005'?20:100}/${query}`;
}
export function parseFoodSafety(raw:string,service:'C005'|'C002'){
 let json:unknown;try{json=JSON.parse(raw);}catch{throw new ApiError('INVALID_RESPONSE');}
 const root=object(json),body=object(root[service]),result=object(body.RESULT??root.RESULT),code=text(result.CODE);
 if(code==='INFO-200')return {rows:[] as Record<string,unknown>[],total:0};
 if(['INFO-100','INFO-110','INFO-120','INFO-400','INFO-600'].includes(code))throw new ApiError('FOODSAFETY_AUTH_FAILED',503);
 if(['INFO-300','INFO-310','INFO-320','INFO-500','ERROR-503'].includes(code))throw new ApiError('UPSTREAM_QUOTA',429);
 if(code!=='INFO-000')throw new ApiError('INVALID_RESPONSE');
 const total=Number(body.total_count),rows=body.row;
 if(!Number.isInteger(total)||total<0||!Array.isArray(rows)||total<rows.length||rows.length>(service==='C005'?20:100)||total>0&&!rows.length)throw new ApiError('INVALID_RESPONSE');
 return {rows:rows.map(object),total};
}
export function barcodeRows(rows:Record<string,unknown>[],code:string):DomesticIdentity[]{
 const found:DomesticIdentity[]=[];const seen=new Set<string>();
 for(const row of rows){const codes=text(row.BAR_CD,1000).split(/[,;|\s]+/u);if(!codes.some(c=>sameBarcode(c,code)))continue;
  const record={barcode:code,reportNo:text(row.PRDLST_REPORT_NO,30),name:text(row.PRDLST_NM,200),manufacturer:text(row.BSSH_NM,200),category:text(row.PRDLST_DCNM,100),reportedAt:text(row.PRMS_DT,30),endedAt:text(row.END_DT,30),closedAt:text(row.CLSBIZ_DT,30)};
  if(!/^\d{6,30}$/u.test(record.reportNo)||!record.name)throw new ApiError('INVALID_RESPONSE');const id=JSON.stringify(record);if(!seen.has(id)){seen.add(id);found.push(record);}
 }return found;
}
const normalized=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function ingredientRows(rows:Record<string,unknown>[],identity:DomesticIdentity):DomesticIngredient[]{
 return rows.map(row=>{const r={reportNo:text(row.PRDLST_REPORT_NO,30),name:text(row.PRDLST_NM,200),manufacturer:text(row.BSSH_NM,200),ingredients:text(row.RAWMTRL_NM),changedAt:text(row.CHNG_DT,30)};
  if(r.reportNo!==identity.reportNo||normalized(r.name)!==normalized(identity.name)||normalized(r.manufacturer)!==normalized(identity.manufacturer))throw new ApiError('PRODUCT_MISMATCH',409);return r;
 });
}
export function createDomesticClient(key:string,fetcher:typeof fetch=fetch,now=Date.now){
 const cache=new Map<string,{at:number;raw:string}>();
 async function get(service:'C005'|'C002',value:string){
  if(!key.trim())throw new ApiError('FOODSAFETY_NOT_CONFIGURED',503);const id=`${service}:${value}`,saved=cache.get(id);if(saved&&now()-saved.at<300000)return {...parseFoodSafety(saved.raw,service),cached:true,retrievedAt:new Date(saved.at).toISOString()};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetcher(foodSafetyUrl(key,service,value),{headers:{Accept:'application/json','User-Agent':'RokyOriginCheck/0.12 (+https://mcroky.github.io/origin-check/)'},redirect:'manual',signal:controller.signal});if(response.status===429)throw new ApiError('UPSTREAM_QUOTA',429);if(!response.ok)throw new ApiError(`UPSTREAM_HTTP_${response.status}`);
   const reader=response.body?.getReader();if(!reader)throw new ApiError('INVALID_RESPONSE');let size=0;const parts:Uint8Array[]=[];
   try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>2000000){await reader.cancel();throw new ApiError('RESPONSE_TOO_LARGE');}parts.push(next.value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}const raw=new TextDecoder().decode(bytes);
   if([key,key.trim(),encodeURIComponent(key.trim())].some(s=>s&&raw.includes(s)))throw new ApiError('INVALID_RESPONSE');const parsed=parseFoodSafety(raw,service);if(cache.size>=80)cache.delete(cache.keys().next().value!);cache.set(id,{at:now(),raw});return {...parsed,cached:false,retrievedAt:new Date(now()).toISOString()};
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(controller.signal.aborted?'TIMEOUT':'UPSTREAM_NETWORK_ERROR');}finally{clearTimeout(timer);}
 }
 async function lookup(raw:unknown):Promise<DomesticLookup>{const code=validateBarcode(raw),data=await get('C005',code);return {code,records:barcodeRows(data.rows,code),total:data.total,bounded:data.total>20,source:BARCODE_SOURCE,retrievedAt:data.retrievedAt,cached:data.cached};}
 return {lookup,async detail(raw:unknown,reportNo:unknown):Promise<DomesticDetail>{if(typeof reportNo!=='string'||!/^\d{6,30}$/u.test(reportNo))throw new ApiError('INVALID_REPORT',400);const match=await lookup(raw),identity=match.records.find(r=>r.reportNo===reportNo);if(!identity)throw new ApiError('PRODUCT_MISMATCH',409);
  const data=await get('C002',reportNo);return {identity,ingredients:ingredientRows(data.rows,identity),total:data.total,bounded:data.total>100,source:INGREDIENT_SOURCE,identitySource:BARCODE_SOURCE,retrievedAt:data.retrievedAt,cached:data.cached};
 }};
}
