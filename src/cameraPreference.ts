import type {CameraChoice} from './scanView';
export type CameraPreference={deviceId:string;label:string};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const key='origin-check-camera-preference-v1';
function browserStorage(){try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}}
export function readCameraPreference(storage:Store|undefined=browserStorage()):CameraPreference|undefined{
 try{const raw=storage?.getItem(key);if(!raw||raw.length>4096)return;const p:unknown=JSON.parse(raw);if(!p||typeof p!=='object')return;const {deviceId,label}=p as Record<string,unknown>;if(typeof deviceId==='string'&&deviceId.length>0&&deviceId.length<=2048&&typeof label==='string'&&label.length<=1024)return {deviceId,label};}catch{}
}
export function writeCameraPreference(preference:CameraPreference|undefined,storage:Store|undefined=browserStorage()){
 try{if(preference)storage?.setItem(key,JSON.stringify(preference));else storage?.removeItem(key);}catch{}
}
export function rememberedCamera(devices:CameraChoice[],preference?:CameraPreference){
 if(!preference)return;const list=devices.filter(d=>d.kind==='videoinput'&&d.deviceId);
 const exact=list.find(d=>d.deviceId===preference.deviceId&&(!preference.label||!d.label||d.label===preference.label));if(exact)return exact;
 const matching=list.filter(d=>preference.label&&d.label===preference.label);return matching.length===1?matching[0]:undefined;
}
