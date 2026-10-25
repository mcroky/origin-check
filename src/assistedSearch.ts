import type {MfdsRecord,SearchInput,SearchResult} from '../server/mfds';
import {cleanProductName,quantityComparison} from './productMatch';
export type SearchAttempt={query:SearchInput;total?:number;error?:string;retrievedAt?:string};
export type RecordOrigin={query:SearchInput;index:number;retrievedAt:string;source:string;cached:boolean};
export type SearchBatch={dataset:'current'|'legacy';query:SearchInput;total?:number;lastPage?:number;hasMore:boolean;error?:string;count:number};
export type AssistedResult={result:SearchResult;query:SearchInput;attempts:SearchAttempt[];observedName:string;origins:RecordOrigin[];bounded:boolean;partialError?:string;batches?:SearchBatch[]};
export function recoveryQueries(query:SearchInput){
 const name=cleanProductName(query.name),tokens=name.split(/\s+/u).filter(t=>/[\p{L}]/u.test(t));
 const tail=tokens.at(-1)??'',previous=tokens.at(-2)??'';
 const suffix=previous.length<=2&&previous.length>0?`${previous} ${tail}`:tail;
 return [...new Set([query.name,suffix,tokens.slice(0,2).join(' ')])].filter(n=>n.length>=2).slice(0,3).map(name=>({...query,name}));
}
// Remove only legal-form notation, never the entire importer condition.
export function importerCore(value:string){return value.normalize('NFKC').replace(/주식회사|\(\s*주\s*\)|㈜/gu,'').replace(/\s+/gu,'').trim();}
// This broadens a search condition, not the reviewed company identity.
export function importerSearchPrefix(value:string){const core=importerCore(value),short=core.replace(/식품$/u,'');return short.length>=3?short:core;}
export function searchQueries(query:SearchInput){
 const base=recoveryQueries(query),compact=query.name.replace(/\s+/gu,''),importer=importerCore(query.importer);
 const withoutQuantity=recordName({name:cleanProductName(query.name)});
 const prefix=importerSearchPrefix(query.importer);
 const primary={...query,name:withoutQuantity.length>=2?withoutQuantity:query.name,importer:prefix.length>=3?prefix:query.importer};
 const variants=[primary,query,...(compact!==query.name?[{...query,name:compact}]:[]),...(importer.length>=2&&importer!==query.importer?[{...query,importer}]:[]),...base.slice(1).flatMap(q=>[q,...(importer.length>=2&&importer!==q.importer?[{...q,importer}]:[])])];
 return variants.filter((q,i)=>variants.findIndex(v=>v.name===q.name&&v.importer===q.importer)===i).slice(0,6);
}
export type SearchOptions={enabled:boolean;signal:AbortSignal;request:(q:SearchInput,signal:AbortSignal)=>Promise<SearchResult>;onAttempt?:(q:SearchInput)=>void;pause?:(signal:AbortSignal)=>Promise<void>;maxRequests?:number};
export async function assistedSearch(query:SearchInput,options:SearchOptions):Promise<AssistedResult>{
 const attempts:SearchAttempt[]=[],origins:RecordOrigin[]=[],records:MfdsRecord[]=[];const seen=new Set<string>();let lastError:unknown,lastResult:SearchResult|undefined,selected=query,partialError:string|undefined;
 const enabled=options.enabled&&query.page===1,queries=enabled?searchQueries(query):[query],budget=enabled?Math.min(6,Math.max(1,options.maxRequests??6)):1;
 outer:for(const variant of queries){
  for(let page=variant.page;page<variant.page+(enabled?3:1)&&attempts.length<budget;page++){
   options.signal.throwIfAborted();if(attempts.length)await options.pause?.(options.signal);options.signal.throwIfAborted();
   const current={...variant,page};options.onAttempt?.(current);
   try{const result=await options.request(current,options.signal);options.signal.throwIfAborted();attempts.push({query:current,total:result.total,retrievedAt:result.retrievedAt});
    if(!result.records.length&&records.length){partialError='RESULTS_CHANGED';break outer;}
    lastResult=result;selected=current;
    result.records.forEach((record,index)=>{const id=JSON.stringify(record);if(seen.has(id))return;seen.add(id);records.push(record);origins.push({query:current,index,retrievedAt:result.retrievedAt,source:result.source,cached:result.cached});});
    if(!result.records.length){if(records.length)break outer;break;}
    if(page*result.pageSize>=result.total||!enabled)break outer;
   }catch(error){options.signal.throwIfAborted();lastError=error;const code=error instanceof Error?error.message:'FAILED';attempts.push({query:current,error:code});
    // Preserve already fetched candidates if a later page fails; never retry auth/quota/timeouts.
    if(records.length){partialError=code;break outer;}
    if(!['UPSTREAM_ERROR','UPSTREAM_PARAMETER'].includes(code))throw error;
    break;
   }
  }
  if(records.length)break;
 }
 if(!lastResult||attempts.at(-1)?.error&&!records.length)throw lastError??Error('FAILED');
 const bounded=Boolean(records.length&&lastResult.page*lastResult.pageSize<lastResult.total);
 return {result:{...lastResult,records,cached:origins.length>0&&origins.every(o=>o.cached)},query:selected,attempts,observedName:query.name,origins,bounded,partialError};
}
export async function searchDatasets(query:SearchInput,mode:'both'|'current'|'legacy',options:SearchOptions):Promise<AssistedResult>{
 if(mode!=='both')return assistedSearch({...query,dataset:mode},options);
 const batches:SearchBatch[]=[],results:AssistedResult[]=[],attempts:SearchAttempt[]=[];let failure:unknown;
 const request:SearchOptions['request']=async(q,signal)=>{try{const r=await options.request(q,signal);attempts.push({query:q,total:r.total,retrievedAt:r.retrievedAt});return r;}catch(error){attempts.push({query:q,error:error instanceof Error?error.message:'FAILED'});throw error;}};
 for(const dataset of ['current','legacy'] as const){
  options.signal.throwIfAborted();if(batches.length)await options.pause?.(options.signal);options.signal.throwIfAborted();
  try{const found=await assistedSearch({...query,dataset}, {...options,request,maxRequests:4});results.push(found);batches.push({dataset,query:found.query,total:found.result.total,lastPage:found.result.page,hasMore:found.bounded,count:found.result.records.length,error:found.partialError});
   if(found.partialError&&['UPSTREAM_QUOTA','RATE_LIMITED'].includes(found.partialError))break;
  }catch(error){options.signal.throwIfAborted();failure=error;const code=error instanceof Error?error.message:'FAILED';batches.push({dataset,query:attempts.at(-1)?.query??{...query,dataset},count:0,hasMore:false,error:code});if(['UPSTREAM_QUOTA','RATE_LIMITED','INVALID_QUERY'].includes(code))break;}
 }
 if(batches.length===1)batches.push({dataset:'legacy',query:{...query,dataset:'legacy'},count:0,hasMore:false,error:'SKIPPED_QUOTA'});
 if(!results.length)throw failure??Error('FAILED');
 const records:MfdsRecord[]=[],origins:RecordOrigin[]=[],seen=new Set<string>();
 for(const found of results)found.result.records.forEach((r,i)=>{const origin=found.origins[i],id=origin.source+JSON.stringify(r);if(!seen.has(id)){seen.add(id);records.push(r);origins.push(origin);}});
 const last=results.at(-1)!;
 return {...last,result:{...last.result,records,total:records.length,page:1,cached:origins.length>0&&origins.every(o=>o.cached)},origins,attempts,observedName:query.name,bounded:batches.some(b=>b.hasMore),partialError:batches.some(b=>b.error)?'PARTIAL':undefined,batches};
}
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function nameSimilarity(a:string,b:string){
 const x=normalize(a).slice(0,160).normalize('NFD'),y=normalize(b).slice(0,160).normalize('NFD');if(!x||!y)return 0;
 let previous=Array.from({length:y.length+1},(_,i)=>i);
 for(let i=1;i<=x.length;i++){const next=[i];for(let j=1;j<=y.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(x[i-1]===y[j-1]?0:1));previous=next;}
 return 1-previous[y.length]/Math.max(x.length,y.length);
}
export function recordName(record:Pick<MfdsRecord,'name'>){return record.name.replace(/\s*[（(]?\s*(?<![A-Za-z0-9])\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\s*[）)]?/giu,'').trim();}
export function rankRecords(records:MfdsRecord[],observedName:string,quantity:string){
 return records.map((record,index)=>({record,index,similarity:nameSimilarity(observedName,recordName(record)),quantity:quantityComparison(quantity,record)})).sort((a,b)=>{
  const size=(q:string)=>q==='different'?-1:q==='same'?1:0;
  return size(b.quantity)-size(a.quantity)||b.similarity-a.similarity||a.index-b.index;
 });
}
