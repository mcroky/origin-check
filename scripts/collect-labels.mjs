import fs from 'node:fs/promises';
const {products}=JSON.parse(await fs.readFile('validation/off-production.json','utf8'));
await fs.mkdir('validation/labels',{recursive:true});
const manifest=[];
for(const p of products){
 const key=Object.keys(p.images||{}).find(k=>k.startsWith('ingredients_'));
 if(!key||manifest.length>=8)continue;
 const folder=p.code.padStart(13,'0').replace(/^(...)(...)(...)(.*)$/,'$1/$2/$3/$4');
 const url=`https://images.openfoodfacts.org/images/products/${folder}/${key}.${p.images[key].rev}.full.jpg`;
 const r=await fetch(url,{headers:{'User-Agent':'RokyOriginPrototype/0.1 (https://mcroky.github.io/roky-studio/)'},signal:AbortSignal.timeout(30000)});
 if(!r.ok){console.log(p.code,r.status);continue;}
 const file=`validation/labels/${p.code}.jpg`;
 await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));
 manifest.push({code:p.code,name:p.product_name||p.code,file,url,source:`https://world.openfoodfacts.org/product/${p.code}`,uploader:p.images[String(p.images[key].imgid)]?.uploader,license:'CC BY-SA 3.0',checkedAt:new Date().toISOString()});
 console.log('saved',p.code,p.product_name);
}
await fs.writeFile('validation/label-manifest.json',JSON.stringify(manifest,null,2));
const stats={sample:products.length,named:products.filter(p=>p.product_name).length,manufacturingPlaces:products.filter(p=>p.manufacturing_places?.trim()).length,origins:products.filter(p=>p.origins?.trim()).length,withAnyImage:products.filter(p=>Object.keys(p.images||{}).length).length,withIngredientsImage:products.filter(p=>Object.keys(p.images||{}).some(k=>k.startsWith('ingredients_'))).length,downloaded:manifest.length};
await fs.writeFile('validation/coverage.json',JSON.stringify(stats,null,2));console.log(stats);
