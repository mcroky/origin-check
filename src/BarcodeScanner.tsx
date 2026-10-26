import {useEffect,useRef,useState} from 'react';
import {ScanSession} from './scanSession';
import {barcodeCopy} from './barcodeI18n';
import type {Lang} from './i18n';
export function BarcodeScanner({lang,disabled,onCode,onStart,onActiveChange}:{lang:Lang;disabled:boolean;onCode:(code:string)=>void;onStart:()=>void;onActiveChange:(active:boolean)=>void}){
 const t=barcodeCopy[lang];const [state,setState]=useState<'idle'|'starting'|'scanning'|'reading'>('idle');const [error,setError]=useState('');
 const video=useRef<HTMLVideoElement>(null),input=useRef<HTMLInputElement>(null),session=useRef(new ScanSession()),photo=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const callbacks=useRef({onCode,onStart,onActiveChange});callbacks.current={onCode,onStart,onActiveChange};
 function stop(){session.current.stop();photo.current?.abort();photo.current=null;clearTimeout(timer.current);callbacks.current.onActiveChange(false);setState('idle');}
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>{document.removeEventListener('visibilitychange',hidden);session.current.stop();photo.current?.abort();clearTimeout(timer.current);};},[]);
 function start(){stop();setError('');callbacks.current.onStart();callbacks.current.onActiveChange(true);return session.current.begin();}
 async function camera(){const id=start();setState('starting');
  timer.current=setTimeout(()=>{if(session.current.current(id)){stop();setError(t.scanTimeout);}},30000);
  try{
   if(!window.isSecureContext)throw Error('INSECURE');if(!navigator.mediaDevices?.getUserMedia)throw Error('NO_CAMERA');
   const decoder=await import('./barcodeDecoder');if(!session.current.current(id))return;
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(!session.current.attachStream(id,stream))return;
   if(!video.current)throw Error('NO_CAMERA');setState('scanning');let previous='',count=0,last=0;
   const controls=await decoder.createBarcodeReader().decodeFromStream(stream,video.current,(result,_error,controls)=>{
    if(!session.current.current(id))return;if(!result)return;const code=decoder.decodedBarcode(result);if(!code)return;const now=Date.now();count=code===previous&&now-last<3000?count+1:1;previous=code;last=now;
    if(count>=2){controls.stop();stop();callbacks.current.onCode(code);}
   });session.current.attachControls(id,controls);
  }catch(error){if(!session.current.current(id))return;stop();const name=error instanceof Error?error.name:'';setError(error instanceof Error&&error.message==='INSECURE'?t.insecure:name==='NotAllowedError'||name==='PermissionDeniedError'?t.permission:t.cameraMissing);}
 }
 async function choose(file?:File){if(!file)return;const id=start(),controller=new AbortController();photo.current=controller;setState('reading');
  try{const decoder=await import('./barcodeDecoder');if(!session.current.current(id))return;const code=await decoder.decodeBarcodePhoto(file,controller.signal);if(!session.current.current(id))return;stop();callbacks.current.onCode(code);}
  catch(error){if(!session.current.current(id))return;stop();setError(error instanceof Error&&error.message==='FILE'?t.file:t.unreadable);}
 }
 const active=state!=='idle';
 return <div className="barcode-scanner"><p className="small muted">{t.privacy}</p><div className="barcode-tools"><button className="primary" disabled={disabled||active} onClick={()=>void camera()}>{t.scan}</button><button className="secondary" disabled={disabled||active} onClick={()=>input.current?.click()}>{t.image}</button>{active&&<button onClick={stop}>{t.stop}</button>}</div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/>
  <video ref={video} autoPlay muted playsInline hidden={state!=='starting'&&state!=='scanning'} aria-label={t.scanning}/>{active&&<p role="status">{state==='reading'?t.reading:state==='starting'?t.starting:t.scanning}</p>}{error&&<p className="error" role="alert">{error}</p>}<p className="small muted">{t.unsupported}</p></div>;
}
