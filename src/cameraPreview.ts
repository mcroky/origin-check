export class PreviewError extends Error{constructor(public code:'PLAY_BLOCKED'|'NO_FRAMES'|'ABORTED'){super(code);}}
type PreviewVideo=Pick<HTMLVideoElement,'play'|'pause'|'setAttribute'|'addEventListener'|'removeEventListener'|'readyState'|'videoWidth'|'videoHeight'|'paused'|'muted'|'autoplay'|'playsInline'|'srcObject'>;
export function clearPreview(video:PreviewVideo){try{video.pause();}catch{}video.srcObject=null;}
export function preparePreview(video:PreviewVideo,stream:MediaStream,signal:AbortSignal,timeoutMs=7000){
 video.muted=true;video.autoplay=true;video.playsInline=true;video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.srcObject=stream;
 return new Promise<void>((resolve,reject)=>{
  let settled=false,played=false;
  const cleanup=()=>{clearTimeout(timer);clearInterval(poll);for(const event of ['loadeddata','canplay','playing','resize'])video.removeEventListener(event,check);signal.removeEventListener('abort',abort);};
  const finish=(error?:PreviewError)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve();};
  const check=()=>{if(played&&!video.paused&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0)finish();};
  const abort=()=>finish(new PreviewError('ABORTED'));
  const timer=setTimeout(()=>finish(new PreviewError('NO_FRAMES')),timeoutMs),poll=setInterval(check,80);
  for(const event of ['loadeddata','canplay','playing','resize'])video.addEventListener(event,check);signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  try{Promise.resolve(video.play()).then(()=>{played=true;check();},()=>finish(new PreviewError('PLAY_BLOCKED')));}catch{finish(new PreviewError('PLAY_BLOCKED'));}
 });
}
export function frameIsDark(data:Uint8ClampedArray){let dark=0,total=0;for(let i=0;i<data.length;i+=4){total++;if(data[i]+data[i+1]+data[i+2]<24)dark++;}return total>0&&dark/total>.97;}
export async function requestCamera(media:Pick<MediaDevices,'getUserMedia'>,facing:'environment'|'user',deviceId?:string){
 try{return await media.getUserMedia({audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{exact:facing}}});}
 catch(error){if(!(error instanceof Error)||!['OverconstrainedError','NotFoundError','DevicesNotFoundError'].includes(error.name))throw error;return media.getUserMedia({audio:false,video:{facingMode:{ideal:facing}}});}
}
