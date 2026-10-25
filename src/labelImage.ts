// The same bounded pixel transform is used in the browser and offline validation.
export type Pixels={data:Uint8ClampedArray;width:number;height:number};
export function enhanceLabel(source:Pixels,contrast=true):Pixels{
 const {data,width,height}=source;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>3200||height>3200||data.length!==width*height*4)throw Error('Invalid image');
 let left=width,top=height,right=0,bottom=0;
 const histogram=new Uint32Array(256);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;const gray=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
  histogram[gray]++;
  if(data[i+3]>128&&gray<230){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 }
 if(left>right||top>bottom)return source;
 const cropW=right-left+1,cropH=bottom-top+1,scale=Math.min(3,1600/cropW,2600/cropH);
 const w=Math.max(1,Math.round(cropW*scale)),h=Math.max(1,Math.round(cropH*scale)),pad=24;
 const output=new Uint8ClampedArray((w+pad*2)*(h+pad*2)*4);output.fill(255);
 const count=width*height;let low=0,high=255,sum=0;
 for(let i=0;i<256;i++){sum+=histogram[i];if(sum>=count*.01){low=i;break;}}
 sum=0;for(let i=255;i>=0;i--){sum+=histogram[i];if(sum>=count*.01){high=i;break;}}
 const range=Math.max(50,high-low);
 const kernel=(v:number)=>{const x=Math.abs(v);return x<1e-8?1:x>=3?0:3*Math.sin(Math.PI*x)*Math.sin(Math.PI*x/3)/(Math.PI*Math.PI*x*x);};
 const weights=(size:number,target:number)=>Array.from({length:target},(_,i)=>{const position=(i+.5)*size/target-.5,start=Math.floor(position)-2;const taps=Array.from({length:6},(_,j)=>({index:Math.min(size-1,Math.max(0,start+j)),weight:kernel(position-start-j)}));const sum=taps.reduce((a,t)=>a+t.weight,0);return taps.map(t=>({...t,weight:t.weight/sum}));});
 const xs=weights(cropW,w),ys=weights(cropH,h),channels=contrast?1:3;
 const horizontal=new Float32Array(cropH*w*channels);
 for(let y=0;y<cropH;y++)for(let x=0;x<w;x++)for(let c=0;c<channels;c++){
  let value=0;for(const tap of xs[x]){const i=((top+y)*width+left+tap.index)*4;value+=(contrast?(.299*data[i]+.587*data[i+1]+.114*data[i+2]-low)*255/range:data[i+c])*tap.weight;}
  horizontal[(y*w+x)*channels+c]=value;
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<channels;c++){
  let value=0;for(const tap of ys[y])value+=horizontal[(tap.index*w+x)*channels+c]*tap.weight;
  const i=((y+pad)*(w+pad*2)+x+pad)*4;if(contrast)output[i]=output[i+1]=output[i+2]=value;else output[i+c]=value;
 }
 return {data:output,width:w+pad*2,height:h+pad*2};
}
