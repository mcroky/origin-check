import type {IncomingMessage,ServerResponse} from 'node:http';
import {ApiError,createMfdsClient,validateSearch} from './mfds.ts';
export function createMfdsHandler(key:string,fetcher:typeof fetch=fetch){
 const client=createMfdsClient(key,fetcher);
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   const path=(req.url??'').split('?')[0];
   if(path==='/api/mfds/status'&&req.method==='GET'){send(200,{configured:client.configured});return;}
   if(path!=='/api/mfds/search'){send(404,{error:'NOT_FOUND'});return;}
   if(req.method!=='POST'){send(405,{error:'METHOD_NOT_ALLOWED'});return;}
   // JSON + same-origin requests prevent browser cross-site quota consumption. No CORS grants.
   if(req.headers['sec-fetch-site']==='cross-site')throw new ApiError('FORBIDDEN',403);
   if(req.headers.origin){let origin:URL;try{origin=new URL(req.headers.origin);}catch{throw new ApiError('FORBIDDEN',403);}if(origin.host!==req.headers.host)throw new ApiError('FORBIDDEN',403);}
   if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError('INVALID_QUERY',415);
   let raw='';let size=0;for await(const part of req){size+=part.length;if(size>4096)throw new ApiError('INVALID_QUERY',413);raw+=part.toString();}
   let value:unknown;try{value=JSON.parse(raw);}catch{throw new ApiError('INVALID_QUERY',400);}
   send(200,await client.search(validateSearch(value)));
  }catch(error){const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR',500);send(safe.status,{error:safe.code});}
 };
}
