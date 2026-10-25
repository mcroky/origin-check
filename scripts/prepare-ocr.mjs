import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
await fs.mkdir('public/ocr/core',{recursive:true});
await fs.mkdir('public/ocr/lang',{recursive:true});
const root=path.dirname(require.resolve('tesseract.js/package.json'));
await fs.copyFile(path.join(root,'dist/worker.min.js'),'public/ocr/worker.min.js');
const core=path.dirname(createRequire(path.join(root,'package.json')).resolve('tesseract.js-core/package.json'));
for(const file of await fs.readdir(core)) if(file.endsWith('.wasm.js')||file.endsWith('.wasm')) await fs.copyFile(path.join(core,file),path.join('public/ocr/core',file));
for(const lang of ['eng','kor','chi_sim','jpn']){
 const file=`public/ocr/lang/${lang}.traineddata.gz`;
 try{await fs.access(file);console.log('exists',lang);continue;}catch{}
 const url=`https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`;
 const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`${lang}: ${r.status}`);
 await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));console.log('downloaded',lang);
}
