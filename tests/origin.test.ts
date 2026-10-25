import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeOrigin,validGtin} from '../src/origin.ts';
const cases:[string,string,string][]=[
 ['한국어 제조국','제조국: 중국','china'],['영어 제조국','MADE IN CHINA','china'],['PRC','Made in P.R.C.','china'],['중국어','中国制造','china'],['일본어','製造国：中国','china'],
 ['한국 제조','제조국: 대한민국','other'],['베트남 제조','Made in Vietnam','other'],['제품 원산지','PRODUCT OF KOREA','other'],['홍콩 별도','Made in Hong Kong','other'],['대만 별도','Made in Taiwan','other'],['영어 단어 경계','Made in Chinatown','unknown'],
 ['한국 브랜드 중국 제조','브랜드: 한국\n제조국: 중국','china'],['중국 브랜드 베트남 제조','브랜드: 중국\nMade in Vietnam','other'],['원료와 완제품 분리','원재료: 대두(중국산)\n제조국: 한국','other'],
 ['원료 단독','원재료 원산지: 중국','unknown'],['원료 영문 단독','Ingredients made in China','unknown'],['주소 단독','수입업체: 서울 한국\nManufactured by ACME, China','unknown'],['브랜드 단독','Brand: China','unknown'],['바코드 중국','6901234567892','unknown'],['바코드 한국','8801062633692','unknown'],['설계국','Designed in Korea','unknown'],['판매국','Distributed by ACME USA','unknown'],
 ['복수 제조','Made in China\nMade in Vietnam','conflict'],['한 줄 복수','제조국: 중국 / 베트남','conflict'],['여러 생산국','Made in China or Thailand','conflict'],['불확실 부정','Not made in China','unknown'],['국산 맥락 부족','원산지: 국산','unknown'],['미지원 국가','Made in Brazil','unknown'],['주소 안의 국가','Made in China Road','unknown'],['빈값','','unknown'],['나뉜 줄','제조국:\n중국','china'],['제품 무관 포장','Packaging made in China','unknown'],['설명 예시','Example: Made in China','unknown'],['원료 후 완제품','원재료: 옥수수(중국)\n제조국: 미국','other'],['제조국 불명','제조국: 미확인 중국','unknown'],
];
for(const [name,input,expected] of cases)test(name,()=>assert.equal(analyzeOrigin(input).status,expected));
test('GTIN checksum and lengths',()=>{assert.equal(validGtin('8801062633692'),true);assert.equal(validGtin('8801062633691'),false);assert.equal(validGtin('123'),false);});
test('evidence retains exact original line',()=>assert.equal(analyzeOrigin('제조국: 중국').evidence[0].line,'제조국: 중국'));
test('packing country is separate from product origin',()=>{const result=analyzeOrigin('Product of Japan. Packed in the UK.');assert.equal(result.status,'other');assert.deepEqual(result.countries,['JP']);});
test('negated production is not positive evidence',()=>assert.equal(analyzeOrigin('No longer made in China').status,'unknown'));
test('contradictory negative statement requires review',()=>assert.equal(analyzeOrigin('Made in China\nNot made in China').status,'unknown'));
test('original punctuation is preserved as evidence',()=>assert.equal(analyzeOrigin('製造国：中国').evidence[0].line,'製造国：中国'));
test('real bullet-separated label preserves country separate from ingredients',()=>{const a=analyzeOrigin('•원산지: 오스트리아 •제조사: A. LOACKER\n•원재료명: 대두(중국)');assert.equal(a.status,'other');assert.deepEqual(a.countries,['AT']);assert.equal(a.evidence[0].line,'원산지: 오스트리아');});
test('wrapped country followed by manufacturer metadata',()=>{const a=analyzeOrigin('*원산지:\n오스트리아 *제조사: A. LOACKER KONFEKT\nGMBH');assert.equal(a.status,'other');assert.deepEqual(a.countries,['AT']);});

test('real table OCR separates country and quantity while preserving the exact evidence line',()=>{const text='원산지 ㅣ이탈리아            내용량 ㅣ500 g (1,764 kcal)';const result=analyzeOrigin(text);assert.equal(result.status,'other');assert.deepEqual(result.countries,['IT']);assert.equal(result.evidence[0].line,text);});
test('table borders are recognized only next to a country field marker',()=>{for(const separator of ['|','ㅣ','│','┃'])assert.equal(analyzeOrigin(`제조국 ${separator} 중국 총 내용량 ${separator} 60ml`).status,'china');assert.equal(analyzeOrigin('수입업소 ㅣ중국 내용량 500g').status,'unknown');});
test('table parsing preserves ingredient exclusions, negatives and conflicting countries',()=>{assert.equal(analyzeOrigin('원재료 원산지 ㅣ중국 내용량 500g').status,'unknown');assert.equal(analyzeOrigin('원산지 ㅣ중국 아님 내용량 500g').status,'unknown');assert.equal(analyzeOrigin('원산지 ㅣ미확인 중국 내용량 500g').status,'unknown');assert.equal(analyzeOrigin('원산지 ㅣ중국 / 베트남 내용량 500g').status,'conflict');assert.equal(analyzeOrigin('원산지 ㅣ중국 Road 내용량 500g').status,'unknown');});
