import fs from 'node:fs/promises';
import {extractProductFields,searchAlternatives} from '../src/productMatch';
const baseline=JSON.parse(await fs.readFile('validation/real-imports/baseline-ocr.json','utf8'));
const out=[];
for(const row of baseline){
 const fields=extractProductFields(row.text);const name=fields.names.find(n=>n.explicit);
 if(!name){out.push({id:row.id,skipped:'No explicit product-name field; suggestions require user review.',fields});continue;}
 const initial={name:name.value,language:name.language,importer:fields.importer};
 const attempts=[];
 for(const query of [initial,...searchAlternatives(initial.name,initial.importer)]){
  const r=await fetch('http://127.0.0.1:5173/api/mfds/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...query,page:1})});
  const result=await r.json();attempts.push({query,http:r.status,...result});console.log(row.id,query.name,result.total??result.error);
  if(result.records?.length)break;
  await new Promise(resolve=>setTimeout(resolve,1200));
 }
 out.push({id:row.id,fields,attempts});await fs.writeFile('validation/real-imports/improved-search.json',JSON.stringify(out,null,2));
 await new Promise(resolve=>setTimeout(resolve,1200));
}
await fs.writeFile('validation/real-imports/improved-search.json',JSON.stringify(out,null,2));
