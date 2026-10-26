import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredRearCamera,cameraChoices,frameCrop,drawScanFrame,type CameraChoice} from '../src/scanView';
import {ScanSession} from '../src/scanSession';
const camera=(deviceId:string,label:string):CameraChoice=>({deviceId,label,kind:'videoinput'});
test('a labeled rear main camera is preferred to an ultrawide lens or a front main camera',()=>{
 const devices=[camera('wide','Back Ultra Wide Camera'),camera('selfie','Front Main Camera'),camera('main','Back Main Camera')];assert.equal(preferredRearCamera(devices,'wide'),'main');
 assert.equal(preferredRearCamera([camera('wide','후면 초광각'),camera('main','후면 기본 카메라')],'wide'),'main');
 assert.equal(preferredRearCamera([camera('wide','后置超广角'),camera('main','后置主摄')],'wide'),'main');
});
test('auxiliary rear cameras are avoided while an ordinary wide-angle lens remains a usable main candidate',()=>{
 const devices=[camera('ultra','Back Ultra-Wide'),camera('tele','Back Telephoto'),camera('wide','Back Wide Camera'),camera('front','Front Camera')];assert.equal(preferredRearCamera(devices,'ultra'),'wide');
});
test('ambiguous device labels do not silently replace the browser selection or select the front camera',()=>{
 assert.equal(preferredRearCamera([camera('a','Camera 1'),camera('b','Camera 2')],'b'),'b');
 assert.equal(preferredRearCamera([camera('a','Back Ultra Wide'),camera('b','Front Main')],'a'),'a');
});
test('number-only rear camera labels choose the first rear candidate instead of retaining an auxiliary browser default',()=>{
 const devices=[camera('front','camera2 1, facing front'),camera('normal','camera2 0, facing back'),camera('other','camera2 2, facing back')];assert.equal(preferredRearCamera(devices,'other'),'normal');
 // Camera 0 is not hardcoded: order and a rear-facing label drive the generic fallback.
 assert.equal(preferredRearCamera([camera('x','Camera 7, facing back'),camera('y','Camera 0, facing back')],'y'),'x');
});
test('plain rear wide camera wins over virtual multi-camera and labeled auxiliary lenses',()=>{
 const devices=[camera('virtual','Back Dual Wide Camera'),camera('tele','Back Tele Camera'),camera('ultra','Back Super Wide Camera'),camera('normal','Back Wide Camera')];assert.equal(preferredRearCamera(devices,'virtual'),'normal');
});
test('camera enumeration failure or a hung enumeration leaves the existing stream usable',async()=>{
 assert.deepEqual(await cameraChoices({enumerateDevices:async()=>{throw Error('unsupported');}},10),[]);
 assert.deepEqual(await cameraChoices({enumerateDevices:()=>new Promise(()=>{})},10),[]);
});
test('switching lenses releases the owned stream before another camera opens and ignores stale releases',()=>{
 const session=new ScanSession();let closed=0;const id=session.begin();session.attachStream(id,{getTracks:()=>[{stop:()=>closed++}]});assert(session.releaseStream(id));assert.equal(closed,1);
 const next=session.begin();session.attachStream(next,{getTracks:()=>[{stop:()=>closed++}]});assert.equal(session.releaseStream(id),false);assert.equal(closed,1);session.stop();assert.equal(closed,2);
});
test('zoom centers the sampled source, keeps aspect ratio and caps output size for landscape and portrait',()=>{
 assert.deepEqual(frameCrop(1920,1080,2),{x:480,y:270,width:960,height:540,outputWidth:1600,outputHeight:900});
 const portrait=frameCrop(1080,1920,3);assert.equal(portrait.width,360);assert.equal(portrait.height,640);assert.equal(portrait.outputWidth,900);assert.equal(portrait.outputHeight,1600);
 assert.equal(frameCrop(640,480,0).width,640);assert.equal(frameCrop(640,480,Infinity).width,640);assert.equal(frameCrop(640,480,99).width,640/3);assert.throws(()=>frameCrop(0,480,2));
});
test('the preview canvas used by the decoder receives zoomed source pixels rather than a CSS-only scale',()=>{
 const calls:unknown[][]=[];const context={drawImage:(...args:unknown[])=>calls.push(args)};const canvas={width:0,height:0,getContext:()=>context} as unknown as HTMLCanvasElement;const video={videoWidth:1280,videoHeight:720} as HTMLVideoElement;
 drawScanFrame(canvas,video,2);assert.deepEqual(calls[0],[video,320,180,640,360,0,0,1280,720]);assert.equal(canvas.width,1280);assert.equal(canvas.height,720);
 drawScanFrame(canvas,video,1);assert.deepEqual(calls[1],[video,0,0,1280,720,0,0,1280,720]);
});
