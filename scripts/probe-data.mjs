import fs from 'node:fs/promises';
await fs.mkdir('validation', {recursive:true});
const fields='code,product_name,brands,quantity,manufacturing_places,origins,countries,image_ingredients_url,image_packaging_url,images,last_modified_t';
const requests=[
 ['production','https://world.openfoodfacts.org/api/v2/search?countries_tags=en:south-korea&page_size=30&fields='+fields],
 ['staging','https://world.openfoodfacts.net/api/v2/search?countries_tags=en:south-korea&page_size=30&fields='+fields]
];
const log=[];
for(const [environment,url] of requests){
 try{
  const response=await fetch(url,{headers:{'User-Agent':'RokyOriginPrototype/0.1 (https://mcroky.github.io/roky-studio/)',...(environment==='staging'?{Authorization:'Basic '+Buffer.from('off:off').toString('base64')}:{})},signal:AbortSignal.timeout(30000)});
  log.push({environment,url,status:response.status,checkedAt:new Date().toISOString()});
  if(response.ok){const data=await response.json();await fs.writeFile(`validation/off-${environment}.json`,JSON.stringify(data,null,2));console.log(environment,JSON.stringify({count:data.count,products:data.products?.map(p=>({code:p.code,name:p.product_name,manufacturing:p.manufacturing_places,image:p.image_ingredients_url}))}));}
  else console.log(environment,response.status);
 }catch(e){log.push({environment,error:e.message});console.log(environment,e.message);}
}
await fs.writeFile('validation/data-probe.json',JSON.stringify(log,null,2));
