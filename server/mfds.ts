// Server-only. Official contract snapshot: validation/mfds-openapi.json.
export const MFDS_SOURCE='https://www.data.go.kr/data/15110214/openapi.do';
export const MFDS_LEGACY_SOURCE='https://www.data.go.kr/data/15110213/openapi.do';
const ENDPOINT='https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem';
export class ApiError extends Error {
 constructor(public code:string,public status=502){super(code);}
}
export type SearchInput={name:string;language:'ko'|'en';importer:string;page:number;dataset?:'current'|'legacy'};
export type MfdsRecord={name:string;englishName:string;importer:string;manufacturer:string;manufacturingCountry:string;exportCountry:string;category:string;processedAt:string;expiry:string;expiryStart:string;expiryEnd:string;label:string;ingredients:string};
export type SearchResult={records:MfdsRecord[];total:number;page:number;pageSize:number;retrievedAt:string;source:string;cached:boolean};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function validateSearch(value:unknown):SearchInput{
 const v=object(value);const name=typeof v.name==='string'?v.name.trim():'';const importer=typeof v.importer==='string'?v.importer.trim():'';const page=v.page??1;
 if(name.length<2||name.length>100||importer.length>100||/[\u0000-\u001f]/u.test(name+importer)||!Number.isInteger(page)||Number(page)<1||Number(page)>100||(v.language!=='ko'&&v.language!=='en')||(v.dataset!==undefined&&!['current','legacy'].includes(String(v.dataset))))throw new ApiError('INVALID_QUERY',400);
 return {name,importer,page:Number(page),language:v.language,...(v.dataset?{dataset:v.dataset as 'current'|'legacy'}:{})};
}
export function normalizeKey(raw:string){
 const key=raw.trim();if(!key)throw new ApiError('NOT_CONFIGURED',503);
 // Prefer Decoding. Also tolerate an encoded key exactly once; URLSearchParams encodes it.
 try{return key.includes('%')?decodeURIComponent(key):key;}catch{throw new ApiError('INVALID_KEY',503);}
}
export function buildUrl(key:string,input:SearchInput){
 const url=new URL(input.dataset==='legacy'?'https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingText/getIprtFoodPrdtKoreanLabelingText':ENDPOINT);url.searchParams.set('serviceKey',normalizeKey(key));url.searchParams.set('type','json');url.searchParams.set('pageNo',String(input.page));url.searchParams.set('numOfRows','10');url.searchParams.set(input.language==='ko'?'prductKoreanNm':'prductNm',input.name);
 if(input.importer)url.searchParams.set('bsnOfcName',input.importer);return url;
}
function upstreamError(code:string):never{
 if(['20','30','31'].includes(code))throw new ApiError('AUTH_FAILED',503);
 if(['22','23'].includes(code))throw new ApiError('UPSTREAM_QUOTA',429);
 if(code==='10')throw new ApiError('UPSTREAM_PARAMETER',502);
 throw new ApiError('UPSTREAM_ERROR');
}
export function parseResponse(text:string,page:number,dataset:SearchInput['dataset']='current'):SearchResult{
 // Gateway auth failures can be XML despite type=json. Never return their raw message/URL.
 if(text.trimStart().startsWith('<')){const code=text.match(/<(?:returnReasonCode|resultCode)>\s*(\d+)\s*<\//)?.[1];if(code)upstreamError(code);throw new ApiError('INVALID_RESPONSE');}
 let json:unknown;try{json=JSON.parse(text);}catch{throw new ApiError('INVALID_RESPONSE');}
 const root=object(json);const response=object(root.response??root);const header=object(response.header);
 const code=String(header.resultCode??'');if(!['00','0'].includes(code))upstreamError(code);
 const body=object(response.body);const total=Number(body.totalCount);
 if(!Number.isInteger(total)||total<0)throw new ApiError('INVALID_RESPONSE');
 const items=body.items;const rows=Array.isArray(items)?items:object(items).item;
 const list=rows==null||rows===''?[]:Array.isArray(rows)?rows:[rows];
 if((total>0&&list.length===0)||(total===0&&list.length>0)||list.length>10)throw new ApiError('INVALID_RESPONSE');
 const records=list.map(row=>{
  // Live MFDS JSON uses items: [{item: {...}}, ...], unlike the schema's singleton wrapper.
  const entry=object(row);const r=object(entry.item??entry);if(!Object.keys(r).some(k=>['PRDUCT_KOREAN_NM','PRDUCT_NM','MNF_NTNCD_NM','KORLABEL'].includes(k)))throw new ApiError('INVALID_RESPONSE');
  const s=(k:string)=>r[k]==null?'':typeof r[k]==='string'?r[k] as string:typeof r[k]==='number'?String(r[k]):'';
  return {name:s('PRDUCT_KOREAN_NM'),englishName:s('PRDUCT_NM'),importer:s('BSN_OFC_NAME'),manufacturer:s('OVSMNFST_NM'),manufacturingCountry:s('MNF_NTNCD_NM'),exportCountry:s('XPORT_NTNCD_NM'),category:s('ITM_NM'),processedAt:s('PROCS_DTM'),expiry:s('EXPIRDE_DTM'),expiryStart:s('EXPIRDE_BEGIN_DTM'),expiryEnd:s('EXPIRDE_END_DTM'),label:s('KORLABEL'),ingredients:s('IRDNT_NM')};
 });
 return {records,total,page,pageSize:10,retrievedAt:new Date().toISOString(),source:dataset==='legacy'?MFDS_LEGACY_SOURCE:MFDS_SOURCE,cached:false};
}
async function limitedText(response:Response){
 if(!response.body)throw new ApiError('INVALID_RESPONSE');
 const reader=response.body.getReader();const parts:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000){await reader.cancel();throw new ApiError('RESPONSE_TOO_LARGE');}parts.push(value);}}finally{reader.releaseLock();}
 const output=new Uint8Array(bytes);let offset=0;for(const part of parts){output.set(part,offset);offset+=part.length;}return new TextDecoder().decode(output);
}
export function createMfdsClient(key:string,fetcher:typeof fetch=fetch,now=Date.now){
 const cache=new Map<string,{at:number;result:SearchResult;timer:ReturnType<typeof setTimeout>}>();let active=0;let last=-Infinity;
 return {configured:Boolean(key.trim()),async search(input:SearchInput):Promise<SearchResult>{
  if(!key.trim())throw new ApiError('NOT_CONFIGURED',503);
  const id=JSON.stringify(input);const hit=cache.get(id);if(hit&&now()-hit.at<300_000)return {...hit.result,cached:true};
  if(active>=2||now()-last<1000)throw new ApiError('RATE_LIMITED',429);
  const url=buildUrl(key,input);last=now();active++;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12_000);
  try{
   const response=await fetcher(url.toString(),{headers:{Accept:'application/json','User-Agent':'RokyOriginCheck/0.12 (+https://mcroky.github.io/origin-check/)'},redirect:'manual',signal:controller.signal});
   if(response.status===429)throw new ApiError('UPSTREAM_QUOTA',429);
   if(response.status===401||response.status===403)throw new ApiError('AUTH_FAILED',503);
   if(!response.ok)throw new ApiError(`UPSTREAM_HTTP_${response.status}`);
   const result=parseResponse(await limitedText(response),input.page,input.dataset);
   // Defensive redaction if an upstream field unexpectedly echoes the credential.
   const encoded=JSON.stringify(result);const secret=normalizeKey(key);
   if([secret,encodeURIComponent(secret)].some(s=>s&&encoded.includes(s)))throw new ApiError('INVALID_RESPONSE');
   if(hit)clearTimeout(hit.timer);
   if(cache.size>=100){const oldest=cache.keys().next().value!;clearTimeout(cache.get(oldest)!.timer);cache.delete(oldest);}
   const expiry=setTimeout(()=>cache.delete(id),300_000);(expiry as ReturnType<typeof setTimeout>&{unref?:()=>void}).unref?.();cache.set(id,{at:now(),result,timer:expiry});return result;
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(controller.signal.aborted?'TIMEOUT':'UPSTREAM_UNAVAILABLE');}
  finally{clearTimeout(timer);active--;}
 }};
}
