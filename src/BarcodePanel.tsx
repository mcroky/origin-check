import {useEffect,useRef,useState} from 'react';
import {BarcodeScanner} from './BarcodeScanner';
import {barcodeCopy} from './barcodeI18n';
import {lookupBarcode,normalizeBarcode,LookupError,type BarcodeLookup} from './productLookup';
import {IngredientResult} from './IngredientResult';
import {APP_VERSION} from './release';
import type {Lang} from './i18n';
import {CompactDetails,compactCopy,useCompact} from './compactUi';
import {cameraCopy} from './cameraI18n';
import {OfficialBarcodePanel} from './OfficialBarcodePanel';
export type BarcodeContext={code:string;name?:string;quantity?:string;source:string;fetchedAt?:string;lookupState:'found'|'not-found'|'failed'};
export function barcodeContext(result:BarcodeLookup|undefined,raw:string):BarcodeContext|undefined{
 let code:string;try{code=normalizeBarcode(raw);}catch{return undefined;}
 if(result?.kind==='found'){const p=result.product;return {code,name:p.name,quantity:p.quantity,source:p.source,fetchedAt:p.fetchedAt,lookupState:'found'};}
 return {code,source:`https://world.openfoodfacts.org/product/${code}`,fetchedAt:result?.fetchedAt,lookupState:result?.kind==='not-found'?'not-found':'failed'};
}
export function BarcodePanel({lang,onLabelPhoto}:{lang:Lang;onLabelPhoto:(context?:BarcodeContext)=>void}){
 const t=barcodeCopy[lang],short=compactCopy[lang],compact=useCompact();const [code,setCode]=useState(''),[data,setData]=useState<BarcodeLookup>(),[busy,setBusy]=useState(false),[scanning,setScanning]=useState(false),[error,setError]=useState(''),[cooling,setCooling]=useState(false),[officialCode,setOfficialCode]=useState(''),[officialIdentity,setOfficialIdentity]=useState<BarcodeContext>();
 const request=useRef<AbortController|null>(null),coolTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;request.current?.abort();clearTimeout(coolTimer.current);},[]);
 useEffect(()=>{clear();},[lang]);
 function clear(){setOfficialIdentity(undefined);setOfficialCode('');generation.current++;request.current?.abort();request.current=null;setBusy(false);setData(undefined);setError('');}
 async function search(raw=code){clear();let normalized:string;try{normalized=normalizeBarcode(raw);}catch{setError(t.invalid);return;}
  setCode(normalized);setOfficialCode(normalized);const id=generation.current,c=new AbortController();request.current=c;setBusy(true);
  try{const result=await lookupBarcode(normalized,lang,c.signal);if(id===generation.current&&!c.signal.aborted)setData(result);}
  catch(error){if(id!==generation.current||c.signal.aborted)return;const failure=error instanceof LookupError?error:new LookupError('NETWORK');setError(failure.code==='INVALID_CODE'?t.invalid:failure.code==='RATE_LIMITED'?t.rate:failure.code==='TIMEOUT'?t.timeout:failure.code==='PRODUCT_MISMATCH'?t.mismatch:failure.code==='BAD_RESPONSE'?t.bad:t.network);
   if(failure.code==='RATE_LIMITED'){setCooling(true);clearTimeout(coolTimer.current);coolTimer.current=setTimeout(()=>setCooling(false),failure.retryAfterMs||5500);}}
  finally{if(id===generation.current){setBusy(false);request.current=null;}}
 }
 const product=data?.kind==='found'?data.product:undefined;
 function download(){if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify({type:'barcode-database-lookup',appVersion:APP_VERSION,scope:t.dbScope,license:'Open Food Facts / ODbL 1.0 / DbCL 1.0',...data},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='barcode-product-result.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const region=(country:string)=>{try{return new Intl.DisplayNames([lang],{type:'region'}).of(country)||country;}catch{return country;}};
 return <section className="barcode-panel"><h2>{t.title}</h2><p className="desktop-only">{t.intro}</p><BarcodeScanner lang={lang} disabled={busy||cooling} onStart={()=>{clear();setCode('');}} onActiveChange={setScanning} onCode={value=>{setCode(value);void search(value);}}/>
  <CompactDetails summary={short.manual}><form onSubmit={e=>{e.preventDefault();void search();}}><label htmlFor="barcode-number">{t.number}</label><div className="search-row"><input id="barcode-number" type="text" inputMode="numeric" autoComplete="off" maxLength={32} value={code} disabled={scanning} onChange={e=>{clear();setCode(e.target.value);}}/><button className="primary" disabled={busy||scanning||cooling||!code.trim()} type="submit">{busy?t.busy:compact?cameraCopy[lang].lookup:t.lookup}</button></div></form><p className="small muted">{t.prefix}</p></CompactDetails>{busy&&<p role="status">{t.busy}<button onClick={clear}>{t.cancel}</button></p>}{error&&<p className="error" role="alert">{error}</p>}
  {officialCode&&<OfficialBarcodePanel key={`${officialCode}:${lang}:${generation.current}`} code={officialCode} lang={lang} product={product} onIdentity={found=>{if(found.records.length===1)setOfficialIdentity({code:found.code,name:found.records[0].name,source:found.source,fetchedAt:found.retrievedAt,lookupState:'found'});}}/>}
  {data&&<div className="barcode-result" aria-live="polite"><h3>Open Food Facts</h3>{data.cached&&<p className="small muted">{t.cache}</p>}{product?<><p className="barcode-result-kicker">{t.found}</p><h2>{product.name||t.unnamed}</h2><p>{product.brands} {product.quantity}</p><code>{product.code}</code><p className="data-warning">{compact?short.caveat:t.caveat}</p>
   <section className="barcode-manufacture"><h3>{t.manufacture}</h3><strong>{product.manufacture.status==='china'?t.china:product.manufacture.status==='other'?t.other:product.manufacture.status==='conflict'?t.conflict:t.unknown}</strong>{['china','other'].includes(product.manufacture.status)&&<p>{product.manufacture.countries.map(region).join(' · ')}</p>}</section>
   <IngredientResult analysis={product.ingredients} lang={lang} basis="database"/>
   <CompactDetails summary={short.source}><p className="small">{t.caveat}</p>
   <details><summary>{t.raw}</summary><dl><dt>{t.manufacturingPlaces}</dt><dd>{product.raw.manufacturingPlaces||t.notProvided}</dd><dt>{t.origins}</dt><dd>{product.raw.origins||t.notProvided}</dd><dt>{t.ingredientText} ({product.raw.ingredientsField})</dt><dd className="raw-label">{product.raw.ingredientsText||t.notProvided}</dd></dl></details>
   {product.missing.length>0&&<div className="data-warning"><strong>{t.missing}</strong><p>{product.missing.map(field=>field==='manufacture'?t.missingManufacture:t.missingIngredient).join(' · ')}</p></div>}
   <dl className="barcode-dates"><dt>{t.fetched}</dt><dd>{new Date(product.fetchedAt).toLocaleString(lang)}</dd>{product.modifiedAt&&<><dt>{t.modified}</dt><dd>{new Date(product.modifiedAt).toLocaleString(lang)}</dd></>}</dl></CompactDetails>
  </>:<><h3>{t.notFound}</h3><p>{t.notFoundBody}</p><code>{data.kind==='not-found'?data.code:data.product.code}</code><p className="small">{t.fetched}: {new Date(data.fetchedAt).toLocaleString(lang)}</p></>}
   <a href={data.kind==='found'?data.product.source:data.source} target="_blank" rel="noopener noreferrer" aria-label={`${t.source} (${t.newTab})`}>{t.source} ↗</a><p className="small muted">Open Food Facts · ODbL 1.0 / DbCL 1.0</p><button className="secondary" onClick={download}>{t.export}</button></div>}
  <div className="barcode-fallback"><button className="primary" disabled={busy||scanning} onClick={()=>onLabelPhoto(officialIdentity??barcodeContext(data,code))}>{t.photo}</button><p className="small muted desktop-only">{t.photoHelp}</p></div>
 </section>;
}
