import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOcrText,type OcrPass} from '../src/ocrSelection.ts';
import {analyzeOrigin} from '../src/origin.ts';
const pass=(kind:OcrPass['kind'],text:string,confidence?:number):OcrPass=>({kind,text,ms:1,confidence});
test('equal field scores retain the clearer OCR instead of the first garbled pass',()=>{
 const clear='Ingredients: flour (China)';
 const text=chooseOcrText([pass('original','EAE SOE HORE ERE',12),pass('colour',clear,80)]);
 assert.equal(text,clear);assert.equal(analyzeOrigin(text).status,'unknown');assert.deepEqual(analyzeOrigin(text).countries,[]);
});
test('confidence cannot hide contradictory manufacturing countries',()=>{
 const text=chooseOcrText([pass('original','Made in China',20),pass('colour','Made in Vietnam',95)]);
 assert.equal(analyzeOrigin(text).status,'conflict');
});
test('a high confidence positive statement cannot hide a negative statement',()=>{
 const text=chooseOcrText([pass('original','Not made in China',5),pass('colour','Made in China',99)]);
 assert.equal(analyzeOrigin(text).status,'unknown');
});
test('passes without confidence keep their existing stable tie order',()=>{
 assert.equal(chooseOcrText([pass('original','first text'),pass('colour','second text')]),'first text');
});
test('targeted quantity/table OCR never replaces full-label context',()=>{
 assert.equal(chooseOcrText([pass('original','Ingredients: sugar',30),pass('table-row','Made in China',100)]),'Ingredients: sugar');
});
