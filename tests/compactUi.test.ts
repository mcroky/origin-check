import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompactDetails} from '../src/compactUi';
import {IngredientResult} from '../src/IngredientResult';
import {analyzeIngredients} from '../src/ingredients';
test('compact guidance is initially closed with native keyboard-accessible summary',()=>{
 const html=renderToStaticMarkup(React.createElement(CompactDetails,{compact:true,summary:'Details',children:'Preserved evidence'}));
 assert.match(html,/<details[^>]*><summary>Details<\/summary>/);assert(!html.includes(' open'));assert(html.includes('Preserved evidence'));
 const desktop=renderToStaticMarkup(React.createElement(CompactDetails,{compact:false,summary:'Details',children:'Preserved evidence'}));assert(!desktop.includes('<details'));assert(desktop.includes('Preserved evidence'));
});
test('compact ingredient results keep uncertain actual use visible outside closed evidence',()=>{
 const analysis=analyzeIngredients('원료명: 곡물(중국 또는 일본)');
 const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis,lang:'ko',compact:true,basis:'database'}));
 const visible=html.split('<details')[0];assert(visible.includes('중국이 후보에 포함'));assert(visible.includes('실제 사용 여부는 미확정'));assert(visible.includes('공개 DB'));assert(html.includes('곡물(중국 또는 일본)'));
});
test('absence of a China statement remains qualified in every compact language',()=>{
 for(const lang of ['ko','en','ja','zh'] as const){const html=renderToStaticMarkup(React.createElement(IngredientResult,{analysis:analyzeIngredients(''),lang,compact:true}));assert(html.split('<details')[0].includes('ingredient-caution'));assert(html.includes('<summary>'));}
});
