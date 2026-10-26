import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyzeIngredients} from '../src/ingredients.ts';
import {analyzeOrigin} from '../src/origin.ts';
import {IngredientResult} from '../src/IngredientResult.tsx';
import {isNewerVersion} from '../src/release.ts';
const cases:[string,string,string][]=[
 ['direct Korean source','원료명: 귀리(중국산)','direct'],
 ['candidate source list','원료명: 귀리[외국산(캐나다, 중국 등)]','possible'],
 ['origin-only field','원료 원산지: 중국','direct'],
 ['countries in different ingredients are not alternatives','원료명: 쌀(미국산), 소금(중국산)','direct'],
 ['wrapped source list','원재료명: 귀리[외국산(\n캐나다, 중국 등)]','possible'],
 ['no heading typo repair in raw text','편료명|쌀(중국산)','direct'],
 ['another structured OCR heading','연료명: 곡물(중국산)','direct'],
 ['English ingredient source','Ingredients: flour (China)','direct'],
 ['English source alternatives','Ingredients: flour (China or Japan)','possible'],
 ['English explicit from','Ingredients: flour from China','direct'],
 ['Japanese ingredient source','原材料名：小麦(中国産)','direct'],
 ['Chinese ingredient source','原料：玉米（中国）','direct'],
 ['Korean excluded source','원재료명: 쌀(중국산 아님)','excluded'],
 ['prefix negative','중국산 원료 미사용','excluded'],
 ['English negative','Ingredients: flour (not from China)','excluded'],
 ['Japanese negative','原材料名：中国産ではない小麦','excluded'],
 ['Chinese negative prefix','不使用中国产原料','excluded'],
 ['unknown use','원료 원산지: 중국 사용 여부 미확인','excluded'],
 ['manufacturing alone cannot become ingredient origin','Made in China','not-found'],
 ['company address cannot become ingredient origin','원재료명: 쌀\n제조원: SAMPLE 중국 공장','not-found'],
 ['exporter cannot become ingredient origin','원재료명: 쌀\n수출국: 중국','not-found'],
 ['English finished-product boundary','Ingredients: sugar\nMade in China','not-found'],
 ['style is not ingredient source','Ingredients: Chinese-style seasoning','not-found'],
 ['other-country source does not mean China-free','원재료명: 귀리(캐나다산)','not-found'],
 ['unqualified word remains unclear','원재료명: 중국 관련 문구','uncertain'],
 ['empty label','', 'not-found']
];
for(const [name,raw,status] of cases)test(name,()=>assert.equal(analyzeIngredients(raw).status,status));
test('ingredient source and finished-product manufacture remain independent',()=>{
 const text='제조국: 한국\n원재료명: 쌀(중국산)';assert.equal(analyzeOrigin(text).status,'other');assert.equal(analyzeIngredients(text).status,'direct');
 const possible='원재료명: 곡물(중국 또는 일본)';assert.equal(analyzeOrigin(possible).status,'unknown');assert.equal(analyzeIngredients(possible).status,'possible');
});
test('negation on another comma-delimited ingredient cannot erase a direct source',()=>{
 const a=analyzeIngredients('원료명: 쌀(중국산), 귀리(미국산 미사용)');assert.equal(a.status,'direct');assert.equal(a.evidence[0].kind,'direct');
});
test('raw evidence and inferred-heading disclosure are retained',()=>{
 const text='편료명| 귀리（중국산）';const a=analyzeIngredients(text);assert.equal(a.evidence[0].line,text);assert.equal(a.evidence[0].contextInferred,true);
});
test('negative source cannot consume a following manufacturing field',()=>{
 const a=analyzeIngredients('중국산 원료 미사용; 제조국: 중국');assert.equal(a.status,'excluded');assert.equal(a.evidence.length,1);
});
test('reviewed ingredient result is visible even when manufacture is unknown',()=>{
 const analysis=analyzeIngredients('원료명: 곡물(중국 또는 일본)');
 const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis,lang:'ko'}));
 assert.match(html,/원료 원산지 후보에 중국 포함/u);assert.match(html,/확정할 수 없습니다/u);assert(!html.includes('<details'));
});
test('all four languages render a distinct ingredient result',()=>{
 const analysis=analyzeIngredients('Ingredients: flour (China or Japan)');
 for(const lang of ['ko','en','ja','zh'] as const){const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis,lang}));assert(html.includes('ingredient-possible'));assert(html.includes('ingredient-title'));}
});
test('untrusted label text is escaped in the result',()=>{
 const line='원료명: 쌀(중국산) <script>alert(1)</script>';
 const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis:analyzeIngredients(line),lang:'ko'}));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
});
test('version checks handle a minor release correctly without downgrade',()=>{
 assert.equal(isNewerVersion('0.10.0','0.9.1'),true);assert.equal(isNewerVersion('0.9.1','0.10.0'),false);assert.equal(isNewerVersion('0.10.0','0.10.0'),false);assert.equal(isNewerVersion('invalid','0.10.0'),false);
});
