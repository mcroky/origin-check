import fs from 'node:fs/promises';
const {products}=JSON.parse(await fs.readFile('validation/off-china.json','utf8'));
const manifest=JSON.parse(await fs.readFile('validation/label-manifest.json','utf8'));
for(const p of products.slice(0,2)){
 if(manifest.some(x=>x.code===p.code))continue;
 const key='ingredients_en';const img=p.images[key];
 const folder=p.code.padStart(13,'0').replace(/^(...)(...)(...)(.*)$/,'$1/$2/$3/$4');
 const url=`https://images.openfoodfacts.org/images/products/${folder}/${key}.${img.rev}.full.jpg`;
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(String(r.status));
 const file=`validation/labels/${p.code}.jpg`;await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));
 manifest.push({code:p.code,name:p.product_name,file,url,source:`https://world.openfoodfacts.org/product/${p.code}`,uploader:p.images[String(img.imgid)]?.uploader,license:'CC BY-SA 3.0',checkedAt:new Date().toISOString(),sampling:'Targeted manufacturing_places=china, not part of Korea sample'});
 console.log('saved',p.code,p.product_name);
}
await fs.writeFile('validation/label-manifest.json',JSON.stringify(manifest,null,2));
