import {useEffect,useRef,useState} from 'react';
import {ScanSession} from './scanSession';
import {barcodeCopy} from './barcodeI18n';
import type {Lang} from './i18n';
import {CompactDetails,compactCopy,useCompact} from './compactUi';
import {cameraCopy} from './cameraI18n';
import {preparePreview,clearPreview,frameIsDark,requestCamera,PreviewError} from './cameraPreview';
import {cameraChoices,preferredRearCamera,drawScanFrame} from './scanView';
import {scanViewCopy} from './scanViewI18n';
export function BarcodeScanner({lang,disabled,onCode,onStart,onActiveChange}:{lang:Lang;disabled:boolean;onCode:(code:string)=>void;onStart:()=>void;onActiveChange:(active:boolean)=>void}){
 const t=barcodeCopy[lang],ct=cameraCopy[lang],vt=scanViewCopy[lang],short=compactCopy[lang],compact=useCompact();const [state,setState]=useState<'idle'|'starting'|'blocked'|'scanning'|'reading'>('idle');const [error,setError]=useState(''),[dark,setDark]=useState(false),[canSwitch,setCanSwitch]=useState(false),[choices,setChoices]=useState<MediaDeviceInfo[]>([]),[activeDevice,setActiveDevice]=useState(''),[zoom,setZoom]=useState(1);
 const video=useRef<HTMLVideoElement>(null),view=useRef<HTMLCanvasElement>(null),input=useRef<HTMLInputElement>(null),capture=useRef<HTMLInputElement>(null),session=useRef(new ScanSession()),photo=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),watcher=useRef<ReturnType<typeof setInterval>|undefined>(undefined),paint=useRef(0),magnification=useRef(1);
 const devices=useRef<MediaDeviceInfo[]>([]),device=useRef(''),chosenDevice=useRef(''),facing=useRef<'environment'|'user'>('environment'),pending=useRef<(()=>Promise<void>)|undefined>(undefined);
 const callbacks=useRef({onCode,onStart,onActiveChange});callbacks.current={onCode,onStart,onActiveChange};
 function stop(){session.current.stop();photo.current?.abort();photo.current=null;pending.current=undefined;clearTimeout(timer.current);clearInterval(watcher.current);cancelAnimationFrame(paint.current);if(video.current)clearPreview(video.current);if(view.current)view.current.width=view.current.height=1;callbacks.current.onActiveChange(false);setDark(false);setState('idle');}
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>{document.removeEventListener('visibilitychange',hidden);session.current.stop();photo.current?.abort();clearTimeout(timer.current);clearInterval(watcher.current);cancelAnimationFrame(paint.current);if(video.current)clearPreview(video.current);};},[]);
 function start(){stop();setError('');callbacks.current.onStart();callbacks.current.onActiveChange(true);return session.current.begin();}
 async function camera(selected?:string){const id=start();setState('starting');magnification.current=1;setZoom(1);
  timer.current=setTimeout(()=>{if(session.current.current(id)){stop();setError(ct.noFrames);}},30000);
  try{
   if(!window.isSecureContext)throw Error('INSECURE');if(!navigator.mediaDevices?.getUserMedia)throw Error('NO_CAMERA');
   let stream=await requestCamera(navigator.mediaDevices,facing.current,selected);if(!session.current.attachStream(id,stream))return;
   device.current=stream.getVideoTracks()[0]?.getSettings().deviceId??selected??'';setCanSwitch(true);
   const list=await cameraChoices(navigator.mediaDevices);if(!session.current.current(id))return;devices.current=list;setChoices(list);
   const preferred=selected||facing.current==='user'?device.current:preferredRearCamera(list,device.current);
   if(preferred&&preferred!==device.current){if(!session.current.releaseStream(id))return;stream=await requestCamera(navigator.mediaDevices,'environment',preferred);if(!session.current.attachStream(id,stream))return;device.current=stream.getVideoTracks()[0]?.getSettings().deviceId??preferred;}
   setActiveDevice(device.current);
   const decoder=await import('./barcodeDecoder');if(!session.current.current(id))return;
   const controller=new AbortController();photo.current=controller;
   const activate=async()=>{
    try{if(!video.current)throw Error('NO_CAMERA');await preparePreview(video.current,stream,controller.signal);if(!session.current.current(id))return;if(!view.current)throw Error('NO_CANVAS');
     drawScanFrame(view.current,video.current,magnification.current);let paintedAt=0;
     const redraw=(now:number)=>{if(!session.current.current(id))return;try{if(now-paintedAt>=66&&video.current&&view.current&&video.current.readyState>=2){drawScanFrame(view.current,video.current,magnification.current);paintedAt=now;}}catch{stop();setError(ct.noFrames);return;}paint.current=requestAnimationFrame(redraw);};paint.current=requestAnimationFrame(redraw);
     pending.current=undefined;setState('scanning');clearTimeout(timer.current);timer.current=setTimeout(()=>{if(session.current.current(id)){stop();setError(t.scanTimeout);}},30000);
     let previous='',count=0,last=0,darkFrames=0,stalled=0;const canvas=document.createElement('canvas');canvas.width=24;canvas.height=16;
     watcher.current=setInterval(()=>{if(!session.current.current(id)||!video.current)return;const v=video.current;
      if(v.readyState<2||v.paused||!v.videoWidth||stream.getVideoTracks()[0]?.readyState==='ended'){if(++stalled>=5){stop();setError(ct.noFrames);}return;}stalled=0;
      try{const c=canvas.getContext('2d',{willReadFrequently:true})!;c.drawImage(v,0,0,24,16);darkFrames=frameIsDark(c.getImageData(0,0,24,16).data)?darkFrames+1:0;setDark(darkFrames>=3);}catch{}
     },800);
     const reader=decoder.createBarcodeReader();let stopped=false,scanTimer:ReturnType<typeof setTimeout>|undefined;
     const controls={stop:()=>{stopped=true;clearTimeout(scanTimer);}};
     const scan=()=>{if(stopped||!session.current.current(id)||!view.current)return;let code:string|undefined;
      try{code=decoder.decodedBarcode(reader.decodeFromCanvas(view.current));}catch{}
      if(code){const now=Date.now();count=code===previous&&now-last<3000?count+1:1;previous=code;last=now;if(count>=2){stop();callbacks.current.onCode(code);return;}}
      scanTimer=setTimeout(scan,200);
     };if(session.current.attachControls(id,controls))scan();
    }catch(error){if(!session.current.current(id))return;if(error instanceof PreviewError&&error.code==='PLAY_BLOCKED'){pending.current=activate;setState('blocked');return;}stop();setError(ct.noFrames);}
   };await activate();
  }catch(error){if(!session.current.current(id))return;stop();const name=error instanceof Error?error.name:'';setError(error instanceof Error&&error.message==='INSECURE'?t.insecure:name==='NotAllowedError'||name==='PermissionDeniedError'?t.permission:t.cameraMissing);}
 }
 function selectCamera(id:string){chosenDevice.current=id;void camera(id||undefined);}
 function switchCamera(){const index=devices.current.findIndex(d=>d.deviceId===device.current),next=devices.current.length>1?devices.current[(index+1)%devices.current.length].deviceId:undefined;if(!next)facing.current=facing.current==='environment'?'user':'environment';chosenDevice.current=next??'';void camera(next);}
 function changeZoom(value:number){magnification.current=value;setZoom(value);if(video.current&&view.current&&state==='scanning')try{drawScanFrame(view.current,video.current,value);}catch{stop();setError(ct.noFrames);}}
 async function choose(file?:File){if(!file)return;const id=start(),controller=new AbortController();photo.current=controller;setState('reading');
  try{const decoder=await import('./barcodeDecoder');if(!session.current.current(id))return;const code=await decoder.decodeBarcodePhoto(file,controller.signal);if(!session.current.current(id))return;stop();callbacks.current.onCode(code);}
  catch(error){if(!session.current.current(id))return;stop();setError(error instanceof Error&&error.message==='FILE'?t.file:t.unreadable);}
 }
 const active=state!=='idle';
 return <div className="barcode-scanner"><p className="small muted mobile-only">{short.privacy}</p><CompactDetails summary={short.scanHelp}><p className="small muted">{t.privacy}</p><p className="small muted">{t.unsupported}</p></CompactDetails>
  <div className="barcode-tools"><button className="primary" disabled={disabled||active} aria-label={t.scan} onClick={()=>void camera(chosenDevice.current||undefined)}>{compact?ct.scan:t.scan}</button><button className="secondary" disabled={disabled||state==='reading'} onClick={()=>{stop();capture.current?.click();}}>{compact?ct.photo:ct.take}</button><button className="quiet barcode-file" disabled={disabled||state==='reading'} onClick={()=>{stop();input.current?.click();}}>{ct.select}</button>{active&&<button onClick={stop}>{t.stop}</button>}</div>
  <input ref={capture} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/>
  <div className="camera-preview" hidden={!['starting','blocked','scanning'].includes(state)}><video className="camera-source" ref={video} autoPlay muted playsInline aria-hidden="true"/><canvas ref={view} className="camera-view" aria-label={t.scanning} style={{visibility:state==='scanning'?'visible':'hidden'}}/>{state==='scanning'&&<div className="barcode-guide" aria-hidden="true"/>}{state!=='scanning'&&<div className="camera-overlay" role="status">{state==='blocked'?ct.blocked:t.starting}{state==='blocked'&&<button className="primary" onClick={()=>{const resume=pending.current;pending.current=undefined;setState('starting');void resume?.();}}>{ct.resume}</button>}</div>}</div>
  {state==='scanning'&&<div className="scan-zoom" role="group" aria-label={vt.zoom}>{[1,2,3].map(value=><button key={value} aria-label={`${vt.zoom} ${value}×`} aria-pressed={zoom===value} onClick={()=>changeZoom(value)}>{value}×</button>)}</div>}
  {canSwitch&&<div className="camera-selection">{choices.length>1?<label htmlFor="barcode-camera">{vt.camera}<select id="barcode-camera" value={choices.some(d=>d.deviceId===activeDevice)?activeDevice:''} disabled={disabled||state==='reading'||state==='starting'} onChange={e=>selectCamera(e.target.value)}>{!choices.some(d=>d.deviceId===activeDevice)&&<option value="">{vt.camera}</option>}{choices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label.slice(0,100)||`${vt.generic} ${i+1}`}</option>)}</select></label>:<button className="secondary camera-switch" disabled={disabled||state==='reading'||state==='starting'} onClick={switchCamera}>{ct.switch}</button>}</div>}{state==='scanning'&&<p className="small" role="status">{dark?ct.dark:vt.hint}</p>}{state==='reading'&&<p role="status">{t.reading}</p>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
