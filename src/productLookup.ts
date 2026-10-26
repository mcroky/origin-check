import {analyzeOrigin,validGtin,type Analysis} from './origin';
import {analyzeIngredients,type IngredientAnalysis} from './ingredients';
import {APP_VERSION} from './release';
import type {Lang} from './i18n';

export type BarcodeProduct={code:string;name:string;brands:string;quantity:string;source:string;fetchedAt:string;modifiedAt?:string;raw:{manufacturingPlaces:string;origins:string;ingredientsText:string;ingredientsField:string};manufacture:Analysis;ingredients:IngredientAnalysis;missing:('manufacture'|'ingredient-origin')[]};
export type BarcodeLookup={kind:'found';product:BarcodeProduct;fetchedAt:string;cached:boolean}|{kind:'not-found';code:string;source:string;fetchedAt:string;cached:boolean};
export class LookupError extends Error{constructor(public code:'INVALID_CODE'|'RATE_LIMITED'|'TIMEOUT'|'NETWORK'|'BAD_RESPONSE'|'PRODUCT_MISMATCH'|'ABORTED',public retryAfterMs=0){super(code);}}
export function normalizeBarcode(raw:string){const code=raw.normalize('NFKC').replace(/[\s-]/gu,'');if(!validGtin(code))throw new LookupError('INVALID_CODE');return code;}
export function sameGtin(a:string,b:string){return validGtin(a)&&validGtin(b)&&a.padStart(14,'0')===b.padStart(14,'0');}
const fields=['code','product_name','product_name_ko','product_name_en','product_name_ja','product_name_zh','brands','quantity','manufacturing_places','origins','ingredients_text','ingredients_text_ko','ingredients_text_en','ingredients_text_ja','ingredients_text_zh','last_modified_t'];
export function productUrl(code:string,lang:Lang){
 code=normalizeBarcode(code);const url=new URL(`https://world.openfoodfacts.org/api/v3.6/product/${code}.json`);
 url.searchParams.set('fields',fields.join(','));url.searchParams.set('lc',lang);url.searchParams.set('app_name','RokyOriginCheck');url.searchParams.set('app_version',APP_VERSION);
 // Browser fetch cannot reliably override User-Agent; include the app's public identity in the request parameters.
 url.searchParams.set('User-Agent',`RokyOriginCheck/${APP_VERSION} (https://github.com/mcroky/origin-check)`);return url;
}
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const value=(v:unknown,limit=200)=>typeof v==='string'?v.trim().slice(0,limit):'';
export function parseBarcodeResponse(payload:unknown,requestedCode:string,lang:Lang,fetchedAt:string):BarcodeLookup{
 if(!object(payload))throw new LookupError('BAD_RESPONSE');
 if(payload.code!==undefined&&(typeof payload.code!=='string'||!sameGtin(payload.code,requestedCode)))throw new LookupError('PRODUCT_MISMATCH');
 const result=object(payload.result)?payload.result:{};
 if(result.id==='product_not_found'&&payload.status==='failure'&&!payload.product)return {kind:'not-found',code:requestedCode,source:`https://world.openfoodfacts.org/product/${requestedCode}`,fetchedAt,cached:false};
 if(payload.status!=='success'||result.id!=='product_found'||!object(payload.product))throw new LookupError('BAD_RESPONSE');
 const p=payload.product,code=value(p.code,14);if(!sameGtin(code,requestedCode))throw new LookupError('PRODUCT_MISMATCH');
 const ingredientsField=[`ingredients_text_${lang}`,'ingredients_text_en','ingredients_text','ingredients_text_ko','ingredients_text_ja','ingredients_text_zh'].find(k=>value(p[k],12000))??'ingredients_text';
 const ingredientsText=value(p[ingredientsField],12000),origins=value(p.origins,3000),manufacturingPlaces=value(p.manufacturing_places,3000);
 // Sales countries, brands, exporter addresses and barcode prefixes never provide manufacture evidence.
 const manufacture=analyzeOrigin(manufacturingPlaces?`제조국:\n${manufacturingPlaces}`:'');
 const ingredientTextAnalysis=analyzeIngredients(ingredientsText?`Ingredients:\n${ingredientsText}`:'');
 const originAnalysis=analyzeIngredients(origins?`원료 원산지:\n${origins}`:'');
 const evidence=[...ingredientTextAnalysis.evidence,...originAnalysis.evidence];
 const hasNegative=evidence.some(e=>e.kind==='excluded'),hasPositive=evidence.some(e=>['direct','possible'].includes(e.kind));
 const status:IngredientAnalysis['status']=hasNegative&&hasPositive?'uncertain':evidence.some(e=>e.kind==='direct')?'direct':evidence.some(e=>e.kind==='possible')?'possible':evidence.some(e=>e.kind==='uncertain')?'uncertain':evidence.length?'excluded':'not-found';
 const ingredients={status,evidence};const missing:BarcodeProduct['missing']=[];
 if(!['china','other'].includes(manufacture.status))missing.push('manufacture');
 const originCountry=analyzeOrigin(origins?`원산지:\n${origins}`:'');
 if(status==='uncertain'||originCountry.status==='unknown'&&!evidence.some(e=>['direct','possible'].includes(e.kind)))missing.push('ingredient-origin');
 const modified=typeof p.last_modified_t==='number'&&Number.isFinite(p.last_modified_t)&&p.last_modified_t>0&&p.last_modified_t*1000<=Date.parse(fetchedAt)+86400000?new Date(p.last_modified_t*1000).toISOString():undefined;
 return {kind:'found',fetchedAt,cached:false,product:{code,name:value(p[`product_name_${lang}`])||value(p.product_name)||value(p.product_name_en),brands:value(p.brands),quantity:value(p.quantity),source:`https://world.openfoodfacts.org/product/${code}`,fetchedAt,modifiedAt:modified,raw:{manufacturingPlaces,origins,ingredientsText,ingredientsField},manufacture,ingredients,missing}};
}
async function readJson(response:Response){
 if(!response.headers.get('content-type')?.includes('json')||Number(response.headers.get('content-length'))>512000)throw new LookupError('BAD_RESPONSE');
 if(!response.body)throw new LookupError('BAD_RESPONSE');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>512000){await reader.cancel();throw new LookupError('BAD_RESPONSE');}chunks.push(part.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new LookupError('BAD_RESPONSE');}
}
export function createBarcodeLookup(options:{fetch?:typeof fetch;now?:()=>number;minIntervalMs?:number;timeoutMs?:number}={}){
 const request=options.fetch??fetch,now=options.now??Date.now;const cache=new Map<string,{at:number;result:BarcodeLookup}>();let nextAllowed=0;
 return async(raw:string,lang:Lang,signal:AbortSignal):Promise<BarcodeLookup>=>{
  const code=normalizeBarcode(raw);if(signal.aborted)throw new LookupError('ABORTED');const key=`${code}:${lang}`,saved=cache.get(key);
  if(saved&&now()-saved.at<300000)return {...saved.result,cached:true};
  if(now()<nextAllowed)throw new LookupError('RATE_LIMITED',nextAllowed-now());nextAllowed=now()+(options.minIntervalMs??5500);
  const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>controller.abort(),options.timeoutMs??15000);
  try{
   const response=await request(productUrl(code,lang),{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/json'},signal:controller.signal});
   if(response.status===429){const seconds=Number(response.headers.get('retry-after'));const retry=Number.isFinite(seconds)&&seconds>0?Math.min(120,seconds)*1000:60000;nextAllowed=Math.max(nextAllowed,now()+retry);throw new LookupError('RATE_LIMITED',retry);}
   if(!response.ok&&response.status!==404)throw new LookupError('NETWORK');
   const payload=await readJson(response);if(controller.signal.aborted)throw new LookupError(signal.aborted?'ABORTED':'TIMEOUT');
   const result=parseBarcodeResponse(payload,code,lang,new Date(now()).toISOString());if(response.status===404&&result.kind!=='not-found')throw new LookupError('BAD_RESPONSE');
   for(const [k,entry] of cache)if(now()-entry.at>=300000)cache.delete(k);if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(key,{at:now(),result});return result;
  }catch(error){if(signal.aborted)throw new LookupError('ABORTED');if(controller.signal.aborted)throw new LookupError('TIMEOUT');if(error instanceof LookupError)throw error;throw new LookupError('NETWORK');}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
 };
}
export const lookupBarcode=createBarcodeLookup();
