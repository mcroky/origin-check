import test from 'node:test';
import assert from 'node:assert/strict';
import bwipjs from 'bwip-js/node';
import sharp from 'sharp';
import {BarcodeFormat,DecodeHintType,MultiFormatOneDReader,RGBLuminanceSource,HybridBinarizer,BinaryBitmap} from '@zxing/library';
import {decodedBarcode,retailFormats} from '../src/barcodeDecoder.ts';
import {ScanSession} from '../src/scanSession.ts';
import {enhanceLabel,type Pixels} from '../src/labelImage';
test('small synthetic photo with narrow margins decodes after enlargement and quiet-zone padding',async()=>{
 const code='8801062633692';
 const png=await bwipjs.toBuffer({bcid:'ean13',text:code,scale:3,height:22,includetext:true,paddingwidth:2,paddingheight:2});
 const {data,info}=await sharp(png).flatten({background:'white'}).resize({width:150}).blur(.5).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const source={data:new Uint8ClampedArray(data),width:info.width,height:info.height};
 function decode(p:Pixels){const gray=new Uint8ClampedArray(p.width*p.height);for(let i=0;i<gray.length;i++)gray[i]=Math.round(.299*p.data[i*4]+.587*p.data[i*4+1]+.114*p.data[i*4+2]);const hints=new Map<DecodeHintType,unknown>([[DecodeHintType.POSSIBLE_FORMATS,retailFormats],[DecodeHintType.TRY_HARDER,true]]);return decodedBarcode(new MultiFormatOneDReader(hints).decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray,p.width,p.height))),hints));}
 assert.throws(()=>decode(source));for(const contrast of [false,true])assert.equal(decode(enhanceLabel(source,contrast)),code);
});
for(const [format,code] of [['ean13','8801062633692'],['ean8','96385074'],['upca','036000291452'],['itf14','10012345000017']]){
 test(`actual ${format} barcode pixels decode with the installed scan engine`,async()=>{
  const png=await bwipjs.toBuffer({bcid:format,text:code,scale:3,height:22,includetext:false,paddingwidth:14,paddingheight:8});
  const {data,info}=await sharp(png).flatten({background:'white'}).greyscale().raw().toBuffer({resolveWithObject:true});
  const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data),info.width,info.height)));
  const hints=new Map<DecodeHintType,unknown>([[DecodeHintType.POSSIBLE_FORMATS,retailFormats],[DecodeHintType.TRY_HARDER,true]]);
  const result=new MultiFormatOneDReader(hints).decode(bitmap,hints);const detected=decodedBarcode(result);
  assert(detected===code||(format==='upca'&&detected===`0${code}`),`${format}: ${detected}`);
 });
}
test('QR payloads, UPC-E ambiguity, invalid check digits and short ITF numbers are not sent to product lookup',()=>{
 for(const [format,code] of [[BarcodeFormat.QR_CODE,'8801062633692'],[BarcodeFormat.UPC_E,'04210005'],[BarcodeFormat.EAN_13,'8801062633691'],[BarcodeFormat.ITF,'123456']] as const){assert.equal(decodedBarcode({getBarcodeFormat:()=>format,getText:()=>code}),undefined);}
});
test('camera stop closes the decoder and every owned media track',()=>{
 let stops=0,controls=0;const s=new ScanSession(),id=s.begin();s.attachStream(id,{getTracks:()=>[{stop:()=>stops++},{stop:()=>stops++}]});s.attachControls(id,{stop:()=>{controls++;}});s.stop();s.stop();assert.equal(stops,2);assert.equal(controls,1);assert(!s.current(id));
});
test('a late camera permission grant after cancel immediately closes that stream',()=>{
 let stops=0;const s=new ScanSession(),old=s.begin();s.stop();assert.equal(s.attachStream(old,{getTracks:()=>[{stop:()=>stops++}]}),false);assert.equal(stops,1);
});
test('late controls from a previous scan cannot stop the active session',()=>{
 let oldStops=0,currentStops=0;const s=new ScanSession(),old=s.begin(),current=s.begin();s.attachStream(current,{getTracks:()=>[{stop:()=>currentStops++}]});assert.equal(s.attachControls(old,{stop:()=>oldStops++}),false);assert.equal(oldStops,1);assert.equal(currentStops,0);assert(s.current(current));s.stop();assert.equal(currentStops,1);
});
test('decoder-stop errors do not prevent closing camera tracks',()=>{
 let stopped=false;const s=new ScanSession(),id=s.begin();s.attachStream(id,{getTracks:()=>[{stop:()=>{stopped=true;}}]});s.attachControls(id,{stop:()=>{throw Error('decoder stopped');}});s.stop();assert(stopped);
});
