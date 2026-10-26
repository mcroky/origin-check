import test from 'node:test';
import assert from 'node:assert/strict';
import {readCameraPreference,writeCameraPreference,rememberedCamera} from '../src/cameraPreference';
import type {CameraChoice} from '../src/scanView';
function store(){const values=new Map<string,string>();return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};}
const device=(deviceId:string,label:string):CameraChoice=>({kind:'videoinput',deviceId,label});
test('manual camera choice is kept locally and automatic reset removes only that preference',()=>{
 const storage=store(),preference={deviceId:'chosen-camera',label:'Back Camera'};storage.setItem('origin-language','ko');writeCameraPreference(preference,storage);assert.deepEqual(readCameraPreference(storage),preference);writeCameraPreference(undefined,storage);assert.equal(readCameraPreference(storage),undefined);assert.equal(storage.getItem('origin-language'),'ko');
});
test('blocked or corrupt browser storage never prevents starting a scan',()=>{
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};assert.equal(readCameraPreference(blocked),undefined);assert.doesNotThrow(()=>writeCameraPreference({deviceId:'x',label:'Back'},blocked));assert.doesNotThrow(()=>writeCameraPreference(undefined,blocked));
 const storage=store();for(const value of ['invalid','null','{}','{"deviceId":"x","label":42}',JSON.stringify({deviceId:'x'.repeat(5000),label:'Back'})]){storage.setItem('origin-check-camera-preference-v1',value);assert.equal(readCameraPreference(storage),undefined);}
});
test('manual choice overrides automatic lens ranking and remains available even with a generic name',()=>{
 const devices=[device('a','camera2 0, facing back'),device('b','camera2 2, facing back')];assert.equal(rememberedCamera(devices,{deviceId:'b',label:devices[1].label})?.deviceId,'b');
});
test('rotated identifiers recover only from one exact label and never choose between identical lens names',()=>{
 const saved={deviceId:'old',label:'Back Camera'};assert.equal(rememberedCamera([device('new','Back Camera')],saved)?.deviceId,'new');assert.equal(rememberedCamera([device('a','Back Camera'),device('b','Back Camera')],saved),undefined);assert.equal(rememberedCamera([device('old','Front Camera')],saved),undefined);assert.equal(rememberedCamera([],saved),undefined);
});
