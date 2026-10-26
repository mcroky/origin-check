import fs from 'node:fs/promises';
import path from 'node:path';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
let notices=`Bundled dependency license notices · v${pkg.version}\nIncludes build dependencies for completeness.\n\n`;
for(const entry of await fs.readdir('node_modules/.pnpm')){
 const root=path.join('node_modules/.pnpm',entry,'node_modules');let names;try{names=await fs.readdir(root);}catch{continue;}
 for(const name of names){
  const dirs=name.startsWith('@')?(await fs.readdir(path.join(root,name))).map(n=>path.join(root,name,n)):[path.join(root,name)];
  for(const dir of dirs){const stat=await fs.lstat(dir);if(stat.isSymbolicLink()||!stat.isDirectory())continue;
   for(const file of (await fs.readdir(dir)).filter(f=>/^(licen[sc]e|copying|notice)(\.|$|-)/i.test(f))){if(!(await fs.stat(path.join(dir,file))).isFile())continue;notices+=`\n===== ${path.relative(root,dir).split(path.sep).join('/')} / ${file} =====\n${await fs.readFile(path.join(dir,file),'utf8')}\n`;}
  }
 }
}
await fs.writeFile('public/dependency-notices.txt',notices);console.log('Updated dependency license notices.');
