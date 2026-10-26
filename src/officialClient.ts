import type {DomesticLookup,DomesticDetail,ImportLookup} from './officialTypes';
import {sameGtin} from './productLookup';
const publicBase='https://origin-check-api.svscorpai1.chatgpt.site';
export function officialUrl(path:'barcode'|'domestic'|'imports'|'status'){
 return `${import.meta.env?.VITE_DEPLOY_TARGET==='pages'?publicBase:''}/api/origin/${path}`;
}
export class OfficialError extends Error{constructor(public code:string){super(code);}}
export async function officialRequest<T>(path:'barcode'|'domestic'|'imports',input:unknown,signal:AbortSignal):Promise<T>{
 const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)controller.abort();const timer=setTimeout(()=>controller.abort(),30000);
 try{const response=await fetch(officialUrl(path),{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(input),signal:controller.signal});
  if(!response.headers.get('content-type')?.includes('json'))throw new OfficialError('UNAVAILABLE');const reader=response.body?.getReader();if(!reader)throw new OfficialError('INVALID_RESPONSE');const parts:Uint8Array[]=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>2500000){await reader.cancel();throw new OfficialError('INVALID_RESPONSE');}parts.push(next.value);}}finally{reader.releaseLock();}
  const output=new Uint8Array(size);let offset=0;for(const part of parts){output.set(part,offset);offset+=part.length;}let json:unknown;try{json=JSON.parse(new TextDecoder().decode(output));}catch{throw new OfficialError('INVALID_RESPONSE');}
  signal.throwIfAborted();if(!response.ok){const error=json&&typeof json==='object'&&'error'in json?String(json.error):'UNAVAILABLE';throw new OfficialError(error);}return json as T;
 }catch(error){if(signal.aborted)throw new OfficialError('ABORTED');if(controller.signal.aborted)throw new OfficialError('TIMEOUT');if(error instanceof OfficialError)throw error;throw new OfficialError('UNAVAILABLE');}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown,fields:string[])=>record(value)&&fields.every(key=>typeof value[key]==='string'&&(value[key] as string).length<=100000);
const timestamp=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const urls={barcode:'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C005',ingredients:'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C002',current:'https://www.data.go.kr/data/15110214/openapi.do',legacy:'https://www.data.go.kr/data/15110213/openapi.do'};
const identity=(v:unknown,code:string)=>strings(v,['barcode','reportNo','name','manufacturer','category','reportedAt','endedAt','closedAt'])&&record(v)&&sameGtin(String(v.barcode),code)&&/^\d{6,30}$/u.test(String(v.reportNo));
export async function lookupDomestic(code:string,signal:AbortSignal){const data=await officialRequest<DomesticLookup>('barcode',{code},signal);
 if(!record(data)||!sameGtin(data.code,code)||!Array.isArray(data.records)||data.records.length>20||!data.records.every(row=>identity(row,code))||data.source!==urls.barcode||!timestamp(data.retrievedAt))throw new OfficialError('INVALID_RESPONSE');return data;
}
export async function lookupDomesticIngredients(code:string,reportNo:string,signal:AbortSignal){const data=await officialRequest<DomesticDetail>('domestic',{code,reportNo},signal);
 if(!record(data)||!identity(data.identity,code)||data.identity.reportNo!==reportNo||!Array.isArray(data.ingredients)||data.ingredients.length>100||!data.ingredients.every(row=>strings(row,['reportNo','name','manufacturer','ingredients','changedAt'])&&row.reportNo===reportNo)||data.source!==urls.ingredients||data.identitySource!==urls.barcode||!timestamp(data.retrievedAt))throw new OfficialError('INVALID_RESPONSE');return data;
}
export async function lookupImportCandidates(code:string,name:string,importer:string,signal:AbortSignal){const data=await officialRequest<ImportLookup>('imports',{code,name,importer,language:/[가-힣]/u.test(name)?'ko':'en'},signal);
 if(!record(data)||!sameGtin(data.code,code)||!Array.isArray(data.candidates)||data.candidates.length>20||!Array.isArray(data.failures)||data.failures.length>2||!data.failures.every(f=>strings(f,['dataset','error']))||!timestamp(data.retrievedAt)||!data.candidates.every(c=>['current','legacy'].includes(c.dataset)&&c.source===urls[c.dataset]&&timestamp(c.retrievedAt)&&strings(c.record,['name','englishName','importer','manufacturer','manufacturingCountry','exportCountry','category','processedAt','expiry','expiryStart','expiryEnd','label','ingredients'])&&strings(c.query,['name','language','importer'])))throw new OfficialError('INVALID_RESPONSE');return data;
}
