import {ApiError,createMfdsClient,validateSearch} from './mfds';
import {createDomesticClient,validateBarcode} from './domestic';
import {memoryBudget,budgetedFetch,clientBudget,type Budget} from './originQuota';
import type {ImportLookup} from '../src/officialTypes';
export const PUBLIC_APP_ORIGIN='https://mcroky.github.io';
export function allowedOrigin(origin:string|null,requestUrl:string){if(!origin)return true;try{const url=new URL(requestUrl);return origin===PUBLIC_APP_ORIGIN||origin===url.origin&&(url.hostname==='127.0.0.1'||url.hostname==='localhost');}catch{return false;}}
async function jsonInput(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('INVALID_QUERY',415);
 if(Number(request.headers.get('content-length'))>2048)throw new ApiError('INVALID_QUERY',413);const reader=request.body?.getReader();if(!reader)throw new ApiError('INVALID_QUERY',400);let raw='',size=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw new ApiError('INVALID_QUERY',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
 try{const v:unknown=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v as Record<string,unknown>;}catch{throw new ApiError('INVALID_QUERY',400);}
}
export function createOfficialHandler(options:{mfdsKey:string;foodSafetyKey:string;budget?:Budget;fetcher?:typeof fetch;now?:()=>number;pause?:()=>Promise<void>}){
 const now=options.now??Date.now,budget=options.budget??memoryBudget(now),request=budgetedFetch(budget,options.fetcher??fetch,now),domestic=createDomesticClient(options.foodSafetyKey,request,now),mfds=createMfdsClient(options.mfdsKey,request,now);
 return async(request:Request):Promise<Response>=>{
  const origin=request.headers.get('origin'),headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const send=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
  if(!allowedOrigin(origin,request.url))return send(403,{error:'FORBIDDEN'});
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';}
  try{
   const path=new URL(request.url).pathname;
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(path==='/api/origin/status'&&request.method==='GET')return send(200,{domesticConfigured:Boolean(options.foodSafetyKey.trim()),importConfigured:mfds.configured});
   if(!['/api/origin/barcode','/api/origin/domestic','/api/origin/imports'].includes(path))return send(404,{error:'NOT_FOUND'});
   if(request.method!=='POST')return send(405,{error:'METHOD_NOT_ALLOWED'});
   const input=await jsonInput(request),code=validateBarcode(input.code);request.signal.throwIfAborted();
   await clientBudget(request,budget,options.mfdsKey||options.foodSafetyKey||'unconfigured',now);
   if(path==='/api/origin/barcode')return send(200,await domestic.lookup(code));
   if(path==='/api/origin/domestic')return send(200,await domestic.detail(code,input.reportNo));
   const query=validateSearch({name:input.name,language:input.language,importer:input.importer??'',page:1});
   const result:ImportLookup={code,candidates:[],failures:[],bounded:false,retrievedAt:new Date(now()).toISOString()};
   for(const dataset of ['current','legacy'] as const){request.signal.throwIfAborted();if(dataset==='legacy'){await (options.pause?.()??new Promise<void>(resolve=>setTimeout(resolve,1050)));request.signal.throwIfAborted();}
    try{const found=await mfds.search({...query,dataset});result.bounded ||=found.total>found.records.length;found.records.forEach((record,index)=>result.candidates.push({record,dataset,source:found.source,retrievedAt:found.retrievedAt,query:{name:query.name,language:query.language,importer:query.importer},index}));}
    catch(error){const code=error instanceof ApiError?error.code:'FAILED';result.failures.push({dataset,error:code});if(['UPSTREAM_QUOTA','RATE_LIMITED','NOT_CONFIGURED'].includes(code))break;}
   }return send(200,result);
  }catch(error){const safe=error instanceof ApiError?error:new ApiError(request.signal.aborted?'ABORTED':'INTERNAL_ERROR',request.signal.aborted?499:500);if(safe.status===429)headers['Retry-After']='60';return send(safe.status,{error:safe.code});}
 };
}
