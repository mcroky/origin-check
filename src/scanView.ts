export type CameraChoice=Pick<MediaDeviceInfo,'deviceId'|'label'|'kind'>;
const front=/front|user|전면|앞면|前面|前置|フロント/i;
const rear=/back|rear|environment|후면|후방|背面|背部|后置|後置|リア/i;
const auxiliary=/ultra[\s-]*wide|ultrawide|초광각|울트라|超[広广廣]角|telephoto|망원|望遠|长焦|macro|매크로|微距|depth|깊이/i;
const main=/main|primary|standard|메인|기본|일반|標準|主摄|主攝/i;
// Labels are hints, not a reliable inventory of physical lenses. Unknown labels retain the browser's choice.
export function preferredRearCamera(devices:CameraChoice[],current:string){
 const candidates=devices.filter(d=>d.kind==='videoinput'&&d.deviceId&&!front.test(d.label)&&rear.test(d.label)&&!auxiliary.test(d.label));
 const explicit=candidates.find(d=>main.test(d.label));if(explicit)return explicit.deviceId;
 const active=devices.find(d=>d.deviceId===current);
 if(active&&auxiliary.test(active.label)&&candidates.length)return candidates[0].deviceId;
 return current;
}
export async function cameraChoices(media:Pick<MediaDevices,'enumerateDevices'>,timeoutMs=1500){
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([media.enumerateDevices().then(ds=>ds.filter(d=>d.kind==='videoinput'&&d.deviceId)),new Promise<MediaDeviceInfo[]>(resolve=>{timer=setTimeout(()=>resolve([]),timeoutMs);})]);}catch{return [];}finally{clearTimeout(timer);}
}
export function frameCrop(width:number,height:number,zoom:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('NO_FRAMES');
 const factor=Number.isFinite(zoom)?Math.max(1,Math.min(3,zoom)):1,w=width/factor,h=height/factor;
 return {x:(width-w)/2,y:(height-h)/2,width:w,height:h,outputWidth:Math.max(1,Math.round(width*Math.min(1,1600/Math.max(width,height)))),outputHeight:Math.max(1,Math.round(height*Math.min(1,1600/Math.max(width,height))))};
}
export function drawScanFrame(canvas:HTMLCanvasElement,video:HTMLVideoElement,zoom:number){
 const crop=frameCrop(video.videoWidth,video.videoHeight,zoom);
 if(canvas.width!==crop.outputWidth||canvas.height!==crop.outputHeight){canvas.width=crop.outputWidth;canvas.height=crop.outputHeight;}
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('NO_CANVAS');
 context.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
}
