import fs from 'node:fs/promises';
const kr=JSON.parse(await fs.readFile('validation/off-production.json','utf8')).products;
const cn=JSON.parse(await fs.readFile('validation/off-china.json','utf8')).products;
await fs.mkdir('validation/benchmark',{recursive:true});
const selected=[...kr,...cn].filter(p=>Object.keys(p.images||{}).some(k=>/^\d+$/.test(k))).slice(0,30);
const manifest=[];
for(const p of selected){
 const key=Object.keys(p.images||{}).find(k=>k==='ingredients_en')||Object.keys(p.images||{}).find(k=>k.startsWith('ingredients_'));
 const id=key?p.images[key].imgid:Object.keys(p.images).filter(k=>/^\d+$/.test(k)).at(-1);
 const url=`https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/${p.code.padStart(13,'0').replace(/^(...)(...)(...)(.*)$/,'$1/$2/$3/$4')}/${id}.jpg`;
 const file=`validation/benchmark/${p.code}.jpg`;
 try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok){console.log(p.code,r.status);continue;}await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));
 manifest.push({code:p.code,name:p.product_name||'',file,url,source:`https://world.openfoodfacts.org/product/${p.code}`,uploader:p.images[id]?.uploader,license:'CC BY-SA 3.0',language:cn.includes(p)?'eng':'kor+eng',sampling:cn.includes(p)?'china manufacturing tag':'south-korea sales tag',checkedAt:new Date().toISOString()});console.log('saved',p.code);
 }catch(e){console.log(p.code,e.message);}
 await fs.writeFile('validation/benchmark-manifest.json',JSON.stringify(manifest,null,2));
}
console.log('total',manifest.length);
