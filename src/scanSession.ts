type CaptureStream={getTracks:()=>{stop:()=>void}[]};
type Controls={stop:()=>void};
function stopStream(stream?:CaptureStream){for(const track of stream?.getTracks()??[])try{track.stop();}catch{}}
export class ScanSession{
 private generation=0;private stream?:CaptureStream;private controls?:Controls;
 begin(){this.stop();return this.generation;}
 current(id:number){return id===this.generation;}
 attachStream(id:number,stream:CaptureStream){if(!this.current(id)){stopStream(stream);return false;}this.stream=stream;return true;}
 attachControls(id:number,controls:Controls){if(!this.current(id)){try{controls.stop();}catch{}return false;}this.controls=controls;return true;}
 releaseStream(id:number){if(!this.current(id))return false;const stream=this.stream;this.stream=undefined;stopStream(stream);return true;}
 stop(){this.generation++;const controls=this.controls,stream=this.stream;this.controls=undefined;this.stream=undefined;try{controls?.stop();}catch{}stopStream(stream);}
}
