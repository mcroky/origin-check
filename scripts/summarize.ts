import fs from 'node:fs/promises';
import {analyzeOrigin} from '../src/origin.ts';
const rows=JSON.parse(await fs.readFile('validation/benchmark-results.json','utf8')) as {code:string;text:string;ms:number}[];
const duration=rows.map(x=>x.ms).sort((a,b)=>a-b);
const classified=rows.map(x=>({code:x.code,...analyzeOrigin(x.text)}));
const summary={n:rows.length,empty:rows.filter(x=>!x.text.trim()).length,medianMs:(duration[14]+duration[15])/2,minMs:duration[0],maxMs:duration.at(-1),statuses:classified.reduce((acc,x)=>({...acc,[x.status]:(acc[x.status]||0)+1}),{} as Record<string,number>),note:'OCR smoke test only; no fully annotated gold labels. Not an accuracy estimate.'};
await fs.writeFile('validation/benchmark-summary.json',JSON.stringify({summary,classified},null,2));console.log(summary);
