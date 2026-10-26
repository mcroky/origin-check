import type {IncomingMessage,ServerResponse} from 'node:http';
import {createOfficialHandler} from './originApi';
export function createOfficialNodeHandler(mfdsKey:string,foodSafetyKey:string){const handler=createOfficialHandler({mfdsKey,foodSafetyKey});return async(req:IncomingMessage,res:ServerResponse)=>{
 const controller=new AbortController();req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
 try{let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"INVALID_QUERY"}');return;}body+=chunk.toString();}
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);}
  const request=new Request(new URL(req.url??'/',`http://${req.headers.host??'127.0.0.1'}`),{method:req.method,headers,body:req.method==='GET'||req.method==='HEAD'?undefined:body,signal:controller.signal});const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(new Uint8Array(await response.arrayBuffer()));
 }catch{if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"INTERNAL_ERROR"}');}}
 };}
