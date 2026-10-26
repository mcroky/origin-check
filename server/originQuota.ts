import {ApiError} from './mfds';
export type Budget={consume:(key:string,limit:number,expiresAt:number)=>Promise<void>};
export function memoryBudget(now=Date.now):Budget{const entries=new Map<string,{used:number;until:number}>();return {async consume(key,limit,until){for(const [k,v] of entries)if(v.until<=now())entries.delete(k);const v=entries.get(key)??{used:0,until};if(v.used>=limit)throw new ApiError('RATE_LIMITED',429);v.used++;entries.set(key,v);}};}
export type SqlStore={prepare:(sql:string)=>{bind:(...args:unknown[])=>{first:<T>()=>Promise<T|null>;run:()=>Promise<unknown>}}};
export function sqlBudget(db:SqlStore,now=Date.now):Budget{
 let cleaned=0;return {async consume(key,limit,expiresAt){if(now()-cleaned>3600000){await db.prepare('DELETE FROM origin_budget WHERE expires_at < ?').bind(now()).run();cleaned=now();}
  const row=await db.prepare('INSERT INTO origin_budget (bucket, used, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET used = used + 1 WHERE used < ? RETURNING used').bind(key,expiresAt,limit).first<{used:number}>();if(!row)throw new ApiError('RATE_LIMITED',429);
 }};
}
export async function clientBudget(request:Request,budget:Budget,secret:string,now=Date.now){
 const time=now(),slot=Math.floor(time/900000),ip=request.headers.get('cf-connecting-ip')??'local';
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${secret}|${slot}|${ip}`));const token=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 await budget.consume(`client:${slot}:${token}`,30,(slot+1)*900000);
}
export function budgetedFetch(budget:Budget,fetcher:typeof fetch,now=Date.now):typeof fetch{return async(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input)),time=now(),hour=Math.floor(time/3600000),day=Math.floor(time/86400000);
 const service=url.hostname==='openapi.foodsafetykorea.go.kr'?(url.pathname.includes('/C005/')?'C005':url.pathname.includes('/C002/')?'C002':''):
  url.hostname==='apis.data.go.kr'?(url.pathname.includes('IprtFoodPrdtKoreanLabelingText')?'legacy':url.pathname.includes('IprtFoodPrdtKoreanLabelingItem')?'current':''):'';
 if(!service||url.protocol!=='https:')throw new ApiError('UPSTREAM_NOT_ALLOWED',500);
 await budget.consume(`upstream:${service}:hour:${hour}`,service.startsWith('C')?60:200,(hour+1)*3600000);
 await budget.consume(`upstream:${service}:day:${day}`,service.startsWith('C')?240:1000,(day+1)*86400000);
 return fetcher(input,init);
};}
