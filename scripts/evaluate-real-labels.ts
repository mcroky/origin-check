import fs from 'node:fs/promises';
import {extractProductFields,compareIdentifier,quantityComparison} from '../src/productMatch.ts';
import {analyzeOrigin} from '../src/origin.ts';
import {extractProductFields as baselineFields} from '../validation/real-imports/baseline-productMatch.ts';
import {analyzeOrigin as baselineOrigin} from '../validation/real-imports/baseline-origin.ts';
import type {MfdsRecord} from '../server/mfds.ts';

// Offline evaluation of frozen OCR and retrieval records; no API or OCR calls.
const root='validation/real-imports/';
const read=async(file:string)=>JSON.parse(await fs.readFile(root+file,'utf8'));
const [manifest,annotations,ocr,searches]=await Promise.all([
 read('manifest.json'),read('annotations.json'),read('baseline-ocr.json'),read('improved-search.json')
]);
const same=(a:string|undefined,b:string|undefined)=>Boolean(a&&b&&compareIdentifier(a,b)==='same');
const improved=[];
const cases=annotations.map((gold:any)=>{
 const row=ocr.find((r:any)=>r.id===gold.id);
 if(!row)throw Error(`Missing OCR: ${gold.id}`);
 const before=baselineFields(row.text),after=extractProductFields(row.text);
 const countryBefore=baselineOrigin(row.text),countryAfter=analyzeOrigin(row.text);
 improved.push({id:gold.id,fields:after,labelCountry:countryAfter});
 const metrics=(fields:typeof after,country:typeof countryAfter)=>({
  explicitName:fields.names.some(n=>n.explicit),
  exactName:fields.names.some(n=>n.explicit&&same(n.value,gold.name)),
  exactImporter:same(fields.importer,gold.importer),
  exactManufacturer:same(fields.manufacturer,gold.manufacturer),
  countryCorrect:Boolean(gold.hasCountry&&!country.ambiguous&&country.status!=='unknown'&&country.countries.length===1&&country.countries[0]===gold.country)
 });
 const attempts=searches.find((r:any)=>r.id===gold.id)?.attempts??[];
 // Gold quantities are manually read from pixels, NOT automatically recognized.
 const compatibleCandidateAfterUserRefinement=Boolean(gold.hasCountry&&attempts.some((a:any)=>a.records?.some((r:MfdsRecord)=>
  ['same','partial'].includes(compareIdentifier(gold.name,r.name))&&same(gold.importer,r.importer)&&same(gold.manufacturer,r.manufacturer)&&r.manufacturingCountry===gold.countryText&&quantityComparison(gold.quantity??'',r)==='same'
 )));
 return {id:gold.id,kind:gold.kind,split:gold.split,hasCountry:gold.hasCountry,before:metrics(before,countryBefore),after:{...metrics(after,countryAfter),compatibleCandidateAfterUserRefinement},attempts:attempts.map((a:any)=>({query:a.query,http:a.http,total:a.total,error:a.error})),note:compatibleCandidateAfterUserRefinement?'Product name, importer, manufacturer, country and manually reviewed quantity agree; lot/date identity unverified.':'No compatible record verified in the examined queries/pages.'};
});
const labels=cases.filter((r:any)=>r.hasCountry);
const count=(stage:'before'|'after',key:string)=>labels.filter((r:any)=>r[stage][key]).length;
const keys=['explicitName','exactName','exactImporter','exactManufacturer','countryCorrect'];
const summary={verifiedAt:new Date().toISOString(),images:manifest.length,products:new Set(manifest.map((r:any)=>r.product)).size,koreanLabels:labels.length,labelKinds:{printedLabelImages:cases.filter((r:any)=>r.kind==='printed-korean-label').length,curvedPackageBackPhoto:cases.filter((r:any)=>r.kind==='curved-package-back-photo').length,frontOrLifestyleControls:cases.filter((r:any)=>!r.hasCountry).length},before:Object.fromEntries(keys.map(k=>[k,count('before',k)])),after:Object.fromEntries([...keys,'compatibleCandidateAfterUserRefinement'].map(k=>[k,count('after',k)])),note:'Convenience sample. Retrieval refinement and manually reviewed quantities are assisted checks, not automatic accuracy. No lot identity or population accuracy claimed.'};
await fs.writeFile(root+'improved-extraction.json',JSON.stringify(improved,null,2));
await fs.writeFile(root+'evaluation.json',JSON.stringify({summary,cases},null,2));
console.log(summary);
