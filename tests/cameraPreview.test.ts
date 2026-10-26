import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePreview,clearPreview,PreviewError,requestCamera,frameIsDark} from '../src/cameraPreview';
class Video extends EventTarget{
 muted=false;autoplay=false;playsInline=false;srcObject:MediaStream|null=null;readyState=0;videoWidth=0;videoHeight=0;paused=true;
 attributes=new Map<string,string>();play=async()=>{this.paused=false;};pause(){this.paused=true;}setAttribute(name:string,value:string){this.attributes.set(name,value);}
 frame(){this.readyState=2;this.videoWidth=640;this.videoHeight=480;this.dispatchEvent(new Event('loadeddata'));}
}
const stream={} as MediaStream;
const code=(expected:string)=>(error:unknown)=>error instanceof PreviewError&&error.code===expected;
test('preview waits for both successful playback and a sized frame',async()=>{
 const video=new Video();let playing!:()=>void;video.play=()=>new Promise<void>(resolve=>{playing=()=>{video.paused=false;resolve();};});
 let ready=false;const promise=preparePreview(video,stream,new AbortController().signal,1000).then(()=>{ready=true;});
 video.frame();await Promise.resolve();assert.equal(ready,false);playing();await promise;
 assert(video.muted&&video.playsInline&&video.autoplay);assert.equal(video.srcObject,stream);assert(video.attributes.has('webkit-playsinline'));
 clearPreview(video);assert(video.paused);assert.equal(video.srcObject,null);
});
test('resolved play without video frames becomes a visible no-frame failure',async()=>{
 await assert.rejects(preparePreview(new Video(),stream,new AbortController().signal,15),code('NO_FRAMES'));
});
test('autoplay rejection is distinct and permits a later user-triggered retry',async()=>{
 const video=new Video();video.play=()=>Promise.reject(new DOMException('blocked','NotAllowedError'));
 await assert.rejects(preparePreview(video,stream,new AbortController().signal,100),code('PLAY_BLOCKED'));
 video.play=async()=>{video.paused=false;};video.frame();await preparePreview(video,stream,new AbortController().signal,100);
});
test('cancel interrupts pending camera playback and late playback cannot succeed',async()=>{
 const video=new Video(),controller=new AbortController();let finish!:()=>void;video.play=()=>new Promise<void>(resolve=>{finish=resolve;});
 const promise=preparePreview(video,stream,controller.signal,100);controller.abort();await assert.rejects(promise,code('ABORTED'));finish();video.frame();
});
test('already cancelled startup never calls play',async()=>{
 const video=new Video(),controller=new AbortController();let calls=0;video.play=async()=>{calls++;};controller.abort();await assert.rejects(preparePreview(video,stream,controller.signal),code('ABORTED'));assert.equal(calls,0);
});
test('unavailable exact rear-camera constraints fall back to an ideal facing request',async()=>{
 const constraints:MediaStreamConstraints[]=[];const media={getUserMedia:async(c:MediaStreamConstraints)=>{constraints.push(c);if(constraints.length===1)throw new DOMException('unavailable','OverconstrainedError');return stream;}};
 assert.equal(await requestCamera(media,'environment'),stream);assert.deepEqual(constraints,[{audio:false,video:{facingMode:{exact:'environment'}}},{audio:false,video:{facingMode:{ideal:'environment'}}}]);
});
test('permission denial is not retried and camera switching requests the selected ID',async()=>{
 let calls=0;const denied={getUserMedia:async()=>{calls++;throw new DOMException('denied','NotAllowedError');}};
 await assert.rejects(requestCamera(denied,'environment'));assert.equal(calls,1);
 await requestCamera({getUserMedia:async c=>{assert.deepEqual(c,{audio:false,video:{deviceId:{exact:'test-rear-camera'}}});return stream;}},'environment','test-rear-camera');
});
test('dark-frame warning does not mistake black-and-white barcode stripes for a black video',()=>{
 const pixels=new Uint8ClampedArray(100*4);for(let i=0;i<100;i++){pixels[i*4+3]=255;if(i%2)pixels.fill(255,i*4,i*4+4);}
 assert.equal(frameIsDark(pixels),false);pixels.fill(0);assert.equal(frameIsDark(pixels),true);assert.equal(frameIsDark(new Uint8ClampedArray()),false);
});
