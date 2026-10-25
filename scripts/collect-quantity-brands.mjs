import fs from 'node:fs/promises';import crypto from 'node:crypto';
const root='validation/quantity-brands/';const rows=[];
for(const [brand,source] of [['tabasco','https://lottemartzetta.com/products/OS8801045896397/details'],['lkk','https://lottemartzetta.com/products/OS8801045197319/details'],['barilla','https://lottemartzetta.com/products/OS8076800195057/details']]){
 const images=JSON.parse(await fs.readFile(root+brand+'-sources.json','utf8'));
 for(const [index,image] of images.entries()){
  const url=image.src;const extension=new URL(url).pathname.split('.').at(-1);const file=root+brand+'-'+index+'.'+extension;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${brand}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(file,bytes);
  rows.push({id:brand+'-'+index,brand,source,url,file,checkedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),rights:'Retailer/manufacturer image. No redistribution license established. Local QA only, excluded from public app.'});console.log(file,bytes.length);
 }
}
await fs.writeFile(root+'manifest.json',JSON.stringify(rows,null,2));
