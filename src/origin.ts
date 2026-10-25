export type Status='china'|'other'|'unknown'|'conflict';
export type Evidence={line:string;countries:string[];kind:'manufacture'|'origin'};
export type Analysis={status:Status;countries:string[];evidence:Evidence[];related:string[];ambiguous:boolean};
const names:Record<string,RegExp>={
 CN:/(?<![a-z])(?:china|p\.?\s*r\.?\s*c\.?)(?![a-z])|중국|中国|中國/iu,
 KR:/(?<![a-z])(?:south\s+korea|republic\s+of\s+korea|korea)(?![a-z])|대한민국|한국|韓国|韩国/iu,
 VN:/(?<![a-z])viet\s*nam(?![a-z])|베트남|ベトナム|越南/iu,
 JP:/(?<![a-z])japan(?![a-z])|일본|日本/iu,
 US:/(?<![a-z])(?:u\.?s\.?a\.?|united\s+states)(?![a-z])|미국|美国|米国/iu,
 TH:/(?<![a-z])thailand(?![a-z])|태국|タイ|泰国/iu,
 ID:/(?<![a-z])indonesia(?![a-z])|인도네시아|インドネシア|印度尼西亚/iu,
 IN:/(?<![a-z])india(?![a-z])|인도(?!네)|インド(?!ネ)|印度(?!尼)/iu,
 TW:/(?<![a-z])taiwan(?![a-z])|대만|台湾|臺灣/iu,
 HK:/(?<![a-z])hong\s+kong(?![a-z])|홍콩|香港/iu,
 DE:/(?<![a-z])germany(?![a-z])|독일|ドイツ|德国/iu,
 FR:/(?<![a-z])france(?![a-z])|프랑스|フランス|法国/iu,
 IT:/(?<![a-z])italy(?![a-z])|이탈리아|イタリア|意大利/iu,
 AU:/(?<![a-z])australia(?![a-z])|호주|オーストラリア|澳大利亚/iu,
 GB:/(?<![a-z])(?:united\s+kingdom|uk)(?![a-z])|영국|イギリス|英国/iu,
 CA:/(?<![a-z])canada(?![a-z])|캐나다|カナダ|加拿大/iu,
 NZ:/(?<![a-z])new\s+zealand(?![a-z])|뉴질랜드|ニュージーランド|新西兰/iu,
 BE:/(?<![a-z])belgium(?![a-z])|벨기에|ベルギー|比利时/iu,
 SG:/(?<![a-z])singapore(?![a-z])|싱가포르|シンガポール|新加坡/iu,
 MY:/(?<![a-z])malaysia(?![a-z])|말레이시아|マレーシア|马来西亚/iu,
 AT:/(?<![a-z])austria(?![a-z])|오스트리아|オーストリア|奥地利/iu,
 PL:/(?<![a-z])poland(?![a-z])|폴란드|ポーランド|波兰/iu,
 NL:/(?<![a-z])netherlands(?![a-z])|네덜란드|オランダ|荷兰/iu,
};
export function countryCodes(text:string){return Object.entries(names).filter(([,re])=>re.test(text)).map(([code])=>code);}
export function analyzeOrigin(raw:string):Analysis{
 const originalLines=raw.split(/\r?\n|[•●*＊]\s*(?=(?:제품명|식품\s*유형|원산지|제조국|제조사|원재료명|수입원|소비기한|내용량)\s*[:：])/u).map(s=>s.trim()).filter(Boolean);
 const lines=originalLines.map(s=>s.normalize('NFKC'));
 const evidence:Evidence[]=[];const related:string[]=[];let ambiguous=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  // Negative and instructional statements must never become positive evidence.
  if(/(?:not|never|no\s+longer)\s+(?:made|manufactured|produced)|(?:非|不是)中国|중국산?\s*(?:아님|아니)|제조국\s*(?:미상|불명|확인\s*불가)|example|예시|可能|may\s+be|might\s+be|아닙니다/iu.test(line)){ambiguous=true;related.push(line);continue;}
  const marker=/(?:made\s+in|manufactured\s+in|produced\s+in|country\s+of\s+manufacture|제\s*조\s*국(?:가)?|제조\s*나라|製造国|制造国|製造國)\s*[:：=\-|ㅣᅵ│┃]?\s*/iu.exec(line);
  const reverse=/(?:中国|中國|日本|韩国|韓国|台湾|臺灣)\s*(?:制造|製造|製)/u;
  const origin=/(?:country\s+of\s+origin|product\s+of|원\s*산\s*지|原産国|原产国)\s*[:：=\-|ㅣᅵ│┃]?\s*/iu.exec(line);
  const ingredient=/원재료|원료|재료명|ingredient|材料|原料|부품|component|packaging|포장재|bottle|병\s*제조/iu.test(line);
  if(ingredient){related.push(line);continue;}
  let value='';let kind:Evidence['kind']='manufacture';
  const found=marker||origin;
  if(found){
   const countryValue=(s:string)=>s.split(/(?:수입|판매|유통|(?:총\s*)?내용량|중량|제조원|제조사|제조업소|식품\s*(?:의\s*)?유형|주소|imported|distributed|designed|ingredients|packed\s+in|packaged\s+in|포장국|[•●*＊|;])/iu)[0].trim();
   value=countryValue(line.slice(found.index+found[0].length));
   if(!value && lines[i+1] && countryCodes(lines[i+1]).length && lines[i+1].length<80)value=countryValue(lines[i+1]);
   if(!marker)kind='origin';
  }else if(reverse.test(line)){value=line;}
  else{if(/원산|원료|국산|import|distribut|designed|品牌|브랜드/iu.test(line))related.push(line);continue;}
  const countries=countryCodes(value);
  if(!countries.length){ambiguous=true;related.push(line);continue;}
  // A country word inside a longer unknown expression/address is not enough.
  const remainder=Object.values(names).reduce((s,re)=>s.replace(new RegExp(re.source,'giu'),''),value).replace(/(?:제조|생산|산|制造|製造|製|made|in|and|or|및|또는|중|외|국가|country|\d+|[\s.,:：()\[\]/&+\-])/giu,'');
  if(remainder.length>0 || /외|등|또는|\bor\b|可能|\?|미확인/iu.test(value)){ambiguous=true;}
  evidence.push({line:!line.endsWith(value)&&found&&line.slice(found.index+found[0].length).trim()===''?`${originalLines[i]}\n${originalLines[i+1]}`:originalLines[i],countries,kind});
 }
 const countries=[...new Set(evidence.flatMap(e=>e.countries))];
 const status:Status=countries.length>1?'conflict':!countries.length||ambiguous?'unknown':countries[0]==='CN'?'china':'other';
 return {status,countries,evidence,related,ambiguous};
}

export function validGtin(value:string){
 if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value))return false;
 const digits=value.split('').map(Number);const check=digits.pop();
 return (10-digits.reverse().reduce((sum,n,i)=>sum+n*(i%2===0?3:1),0)%10)%10===check;
}
